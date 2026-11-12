package egovframework.let.pr.process.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import javax.sql.DataSource;
import org.apache.ibatis.session.SqlSessionFactory;
import org.egovframe.rte.fdl.cmmn.trace.LeaveaTrace;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.pr.process.controller.ProcessManagementApiController;
import egovframework.let.pr.process.domain.model.ProcessChangesVO;
import egovframework.let.pr.process.domain.model.ProcessNodeVO;
import egovframework.let.pr.process.domain.repository.ProcessManagementDAO;
import egovframework.let.pr.process.service.impl.ProcessManagementServiceImpl;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = ProcessManagementPostgresIntegrationTest.Config.class)
// Opt-in only: setup creates and truncates tables in the dedicated test database.
@EnabledIfEnvironmentVariable(named = "PROCESS_TEST_JDBC_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/process_isolated_test")
class ProcessManagementPostgresIntegrationTest {
    @Configuration
    @EnableTransactionManagement
    static class Config {
        @Bean
        LeaveaTrace leaveaTrace() { return mock(LeaveaTrace.class); }

        @Bean
        DataSource dataSource() {
            DriverManagerDataSource source = new DriverManagerDataSource(
                    System.getenv("PROCESS_TEST_JDBC_URL"), "pgtest", System.getenv("PROCESS_TEST_PASSWORD"));
            JdbcTemplate jdbc = new JdbcTemplate(source);
            if (!"process_isolated_test".equals(jdbc.queryForObject("SELECT current_database()", String.class))) {
                throw new IllegalStateException("Integration tests require an isolated database");
            }
            jdbc.execute("CREATE TABLE tb_tenant (tenant_id BIGINT PRIMARY KEY)");
            new ResourceDatabasePopulator(new FileSystemResource(
                    "../docs/database/20261112/20261112_003_create_process_management.sql")).execute(source);
            return source;
        }

        @Bean(name = "sqlSession")
        SqlSessionFactory sqlSessionFactory(DataSource source) throws Exception {
            SqlSessionFactoryBean factory = new SqlSessionFactoryBean();
            factory.setDataSource(source);
            factory.setConfigLocation(new ClassPathResource("egovframework/mapper/config/mapper-config.xml"));
            factory.setMapperLocations(new ClassPathResource(
                    "egovframework/mapper/let/pr/process/ProcessManagement_SQL_postgresql.xml"));
            return factory.getObject();
        }

        @Bean
        ProcessManagementDAO dao(SqlSessionFactory factory) {
            ProcessManagementDAO dao = new ProcessManagementDAO();
            dao.setSqlSessionFactory(factory);
            return dao;
        }

        @Bean
        ProcessManagementService service(ProcessManagementDAO dao) {
            return new ProcessManagementServiceImpl(dao);
        }

        @Bean
        PlatformTransactionManager transactionManager(DataSource source) {
            return new DataSourceTransactionManager(source);
        }
    }

    @Autowired private ProcessManagementService service;
    @Autowired private DataSource source;

    @BeforeEach
    void reset() {
        JdbcTemplate jdbc = new JdbcTemplate(source);
        jdbc.execute("TRUNCATE tb_process, tb_process_group, tb_tenant RESTART IDENTITY CASCADE");
        jdbc.update("INSERT INTO tb_tenant (tenant_id) VALUES (1), (2)");
    }

    @Test
    void createsGroupAndChildAndEnforcesTenantIsolation() {
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Arrays.asList(process("p:new-2", "g:new-1"), group("g:new-1")));
        List<ProcessNodeVO> saved = service.save(1L, changes);
        assertEquals(2, saved.size());
        assertEquals(0, service.list(2L).size());
        ProcessNodeVO existing = saved.stream().filter(row -> row.getId().startsWith("p:")).findFirst().get();
        changes = new ProcessChangesVO();
        changes.setDeletedRows(Collections.singletonList(existing));
        ProcessChangesVO foreignDelete = changes;
        assertThrows(IllegalArgumentException.class, () -> service.save(2L, foreignDelete));
        assertEquals(2, service.list(1L).size());
    }

    @Test
    void rollsBackGroupIfChildRefersToMissingGroup() {
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Arrays.asList(group("g:new-1"), process("p:new-2", "g:999")));
        assertThrows(IllegalStateException.class, () -> service.save(1L, changes));
        assertEquals(0, service.list(1L).size());
    }

    @Test
    void rejectsDeletingGroupWithChild() {
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Arrays.asList(group("g:new-1"), process("p:new-2", "g:new-1")));
        ProcessNodeVO existingGroup = service.save(1L, changes).stream()
                .filter(row -> row.getId().startsWith("g:")).findFirst().get();
        ProcessChangesVO deletion = new ProcessChangesVO();
        deletion.setDeletedRows(Collections.singletonList(existingGroup));
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, deletion));
        assertEquals(2, service.list(1L).size());
    }

    @Test
    void savesAndReadsThroughHttpController() throws Exception {
        LoginVO user = new LoginVO();
        user.setTenantId(1L);
        SystemMenuService menuService = mock(SystemMenuService.class);
        MenuTreeNodeVO menu = new MenuTreeNodeVO();
        menu.setPath("/pr/master/process-management");
        menu.setPermissions(new MenuPermissionVO(true, true, true, true));
        MyMenuResponseVO tree = new MyMenuResponseVO();
        tree.setMenus(Collections.singletonList(menu));
        when(menuService.getMyMenuTree(user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode()))
                .thenReturn(tree);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(
                new ProcessManagementApiController(service, menuService, new ResultVoHelper()))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList()));
        try {
            mvc.perform(post("/api/v1/pr/processes/save-batch")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"insertedRows\":[{\"id\":\"g:new-1\",\"name\":\"Group\"},"
                            + "{\"id\":\"p:new-2\",\"parentId\":\"g:new-1\",\"name\":\"Process\"}],"
                            + "\"updatedRows\":[],\"deletedRows\":[]}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result.resultList.length()").value(2));
            mvc.perform(get("/api/v1/pr/processes"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result.resultList.length()").value(2));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private ProcessNodeVO group(String id) {
        ProcessNodeVO row = new ProcessNodeVO();
        row.setId(id);
        row.setName("Group");
        return row;
    }

    private ProcessNodeVO process(String id, String parentId) {
        ProcessNodeVO row = new ProcessNodeVO();
        row.setId(id);
        row.setParentId(parentId);
        row.setName("Process");
        return row;
    }
}
