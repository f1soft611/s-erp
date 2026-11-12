package egovframework.let.pr.process.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import egovframework.let.pr.process.domain.model.ProcessChangesVO;
import egovframework.let.pr.process.domain.repository.ProcessManagementDAO;
import egovframework.let.pr.process.service.impl.ProcessManagementServiceImpl;
import org.apache.ibatis.session.SqlSessionFactory;
import org.egovframe.rte.fdl.cmmn.trace.LeaveaTrace;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.SimpleTransactionStatus;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = ProcessManagementTransactionTest.Config.class)
class ProcessManagementTransactionTest {
    @Configuration
    @EnableTransactionManagement
    static class Config {
        @Bean(name = "sqlSession") SqlSessionFactory sqlSessionFactory() { return mock(SqlSessionFactory.class); }
        @Bean LeaveaTrace leaveaTrace() { return mock(LeaveaTrace.class); }
        @Bean ProcessManagementDAO dao() { return mock(ProcessManagementDAO.class); }
        @Bean ProcessManagementService service(ProcessManagementDAO dao) { return new ProcessManagementServiceImpl(dao); }
        @Bean PlatformTransactionManager transactionManager() { return mock(PlatformTransactionManager.class); }
    }

    @Autowired private ProcessManagementService service;
    @Autowired private PlatformTransactionManager transactionManager;
    private SimpleTransactionStatus status;

    @BeforeEach
    void setUp() {
        reset(transactionManager);
        status = new SimpleTransactionStatus();
        when(transactionManager.getTransaction(any(TransactionDefinition.class))).thenReturn(status);
    }

    @Test
    void commitsThroughTheServiceInterface() {
        assertTrue(AopUtils.isAopProxy(service));
        service.save(1L, new ProcessChangesVO());
        verify(transactionManager).commit(status);
    }

    @Test
    void rollsBackWhenValidationFails() {
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, null));
        verify(transactionManager).rollback(status);
    }
}
