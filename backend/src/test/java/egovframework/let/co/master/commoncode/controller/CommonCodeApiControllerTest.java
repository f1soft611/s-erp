package egovframework.let.co.master.commoncode.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupSearchCondition;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;
import egovframework.let.co.master.commoncode.service.CommonCodeBatchService;
import egovframework.let.co.master.commoncode.service.CommonCodeGroupService;
import egovframework.let.co.master.commoncode.service.CommonCodeItemService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

@ExtendWith(MockitoExtension.class)
class CommonCodeApiControllerTest {

    @Mock
    private CommonCodeGroupService commonCodeGroupService;

    @Mock
    private CommonCodeItemService commonCodeItemService;

    @Mock
    private CommonCodeBatchService commonCodeBatchService;

    @Mock
    private SystemMenuService systemMenuService;

    @Spy
    private ResultVoHelper resultVoHelper = new ResultVoHelper();

    @InjectMocks
    private CommonCodeGroupApiController controller;

    private MockMvc mockMvc;
    private LoginVO user;

    @BeforeEach
    void setUp() {
        user = new LoginVO();
        user.setTenantId(1L);
        user.setId("test-login");
        user.setRoleId(7L);
        user.setRoleCode("TENANT_USER");
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
                .build();
    }

    @Test
    void listGroupsReturnsGroupsForTenant() throws Exception {
        CommonCodeGroupVO group = new CommonCodeGroupVO();
        group.setCommonCodeGroupId(1L);
        group.setGroupCode("ATTACH_DOC");
        group.setGroupNm("첨부문서업무");
        when(commonCodeGroupService.listGroups(eq(1L))).thenReturn(Collections.singletonList(group));

        mockMvc.perform(get("/api/v1/co/master/common-code/groups")
                .principal(authenticationFor()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList[0].commonCodeGroupId").value(1))
                .andExpect(jsonPath("$.result.resultList[0].groupCode").value("ATTACH_DOC"));
    }

        @Test
        void listGroupsPassesSearchConditionsToService() throws Exception {
        when(commonCodeGroupService.listGroups(eq(1L), any(CommonCodeGroupSearchCondition.class)))
            .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/co/master/common-code/groups")
            .param("keyword", "공통")
            .param("groupCode", "DOC")
            .param("groupNm", "문서")
            .principal(authenticationFor()))
            .andExpect(status().isOk());

        verify(commonCodeGroupService).listGroups(eq(1L), org.mockito.ArgumentMatchers.argThat(condition ->
            "공통".equals(condition.getKeyword())
                && "DOC".equals(condition.getGroupCode())
                && "문서".equals(condition.getGroupNm())
                && condition.getGroupDc() == null));
        }

    @Test
    void createItemRejectsParentOnDifferentGroup() throws Exception {
        allow(new MenuPermissionVO(false, true, false, false));
        CommonCodeItemVO item = new CommonCodeItemVO();
        item.setCommonCodeItemId(11L);
        item.setItemCode("STATEMENT");
        when(commonCodeItemService.createItem(eq(1L), eq(2L), any())).thenThrow(new IllegalArgumentException("상위 상세코드는 현재 그룹의 부모 그룹 상세코드만 선택할 수 있습니다."));

        mockMvc.perform(post("/api/v1/co/master/common-code/groups/2/items")
                .principal(authenticationFor())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemCode\":\"STATEMENT\",\"itemNm\":\"거래명세서\",\"parentItemId\":99,\"sortOrder\":1,\"useAt\":\"Y\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.result.message").value("상위 상세코드는 현재 그룹의 부모 그룹 상세코드만 선택할 수 있습니다."));
    }

            @Test
                void saveBatchReturnsDuplicateCodeMessageAsResultMessage() throws Exception {
            allow(new MenuPermissionVO(false, false, true, false));
            String duplicateMessage = "이미 사용 중인 상세 코드입니다.";
                when(commonCodeBatchService.saveBatch(eq(1L), any()))
                .thenThrow(new IllegalArgumentException(duplicateMessage));

                mockMvc.perform(post("/api/v1/co/master/common-code/save-batch")
                .principal(authenticationFor())
                .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.resultCode").value(ResponseCode.INPUT_CHECK_ERROR.getCode()))
                .andExpect(jsonPath("$.resultMessage").value(duplicateMessage))
                .andExpect(jsonPath("$.result.message").value(duplicateMessage));
            }

    @ParameterizedTest
    @CsvSource({"common-code,true", "common-code,false", "cmncodes,true", "cmncodes,false"})
    void eitherWritePermissionAllowsNonAdminBatchAndSingleSaves(String pageKey, boolean create) throws Exception {
        allow("/co", "/co/master/" + pageKey, new MenuPermissionVO(false, create, !create, false));

        mockMvc.perform(write(post("/api/v1/co/master/common-code/save-batch"), "{\"tenantId\":999}"))
                .andExpect(status().isOk());
        mockMvc.perform(write(post("/api/v1/co/master/common-code/groups"), "{}"))
                .andExpect(status().isCreated());
        mockMvc.perform(write(put("/api/v1/co/master/common-code/groups/2"), "{}"))
                .andExpect(status().isOk());
        mockMvc.perform(write(post("/api/v1/co/master/common-code/groups/2/items"), "{}"))
                .andExpect(status().isCreated());
        mockMvc.perform(write(put("/api/v1/co/master/common-code/groups/2/items/3"), "{}"))
                .andExpect(status().isOk());

        verify(commonCodeBatchService).saveBatch(eq(1L), any());
        verify(commonCodeGroupService).createGroup(eq(1L), any());
        verify(commonCodeGroupService).updateGroup(eq(1L), eq(2L), any());
        verify(commonCodeItemService).createItem(eq(1L), eq(2L), any());
        verify(commonCodeItemService).updateItem(eq(1L), eq(2L), eq(3L), any());
    }

    @ParameterizedTest
    @CsvSource({"common-code,TENANT_USER", "common-code,TENANT_ADMIN", "common-code,PLATFORM_ADMIN",
            "cmncodes,TENANT_USER", "cmncodes,TENANT_ADMIN", "cmncodes,PLATFORM_ADMIN"})
    void readOnlyCannotAuthorizeChangesEvenForAdmin(String pageKey, String roleCode) throws Exception {
        user.setRoleCode(roleCode);
        allow("/co", "/co/master/" + pageKey, new MenuPermissionVO(true, false, false, false));

        assertChangesForbidden();

        verifyNoInteractions(commonCodeBatchService, commonCodeGroupService, commonCodeItemService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/co/master/materials", "/sales/master/cmncodes", "/sales/master/common-code"})
    void anotherMenuCannotAuthorizeCommonCodeChanges(String path) throws Exception {
        allow(path.startsWith("/co/") ? "/co" : "/sales", path,
                new MenuPermissionVO(true, true, true, true));

        assertChangesForbidden();

        verifyNoInteractions(commonCodeBatchService, commonCodeGroupService, commonCodeItemService);
    }

    @Test
    void missingMenuCannotAuthorizeChanges() throws Exception {
        assertChangesForbidden();

        verifyNoInteractions(commonCodeBatchService, commonCodeGroupService, commonCodeItemService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"groups", "items"})
    void batchDeletionRequiresDeletePermissionBeforeCallingService(String changes) throws Exception {
        allow(new MenuPermissionVO(false, false, true, false));

        mockMvc.perform(write(post("/api/v1/co/master/common-code/save-batch"),
                "{\"" + changes + "\":{\"deletedRows\":[{\"id\":\"3\",\"groupId\":\"2\"}]}}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(commonCodeBatchService, commonCodeGroupService, commonCodeItemService);
    }

    @Test
    void deletePermissionAllowsSingleDeletesAndWritePlusDeleteAllowsBatch() throws Exception {
        allow(new MenuPermissionVO(false, false, false, true));
        mockMvc.perform(delete("/api/v1/co/master/common-code/groups/2").principal(authenticationFor()))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/v1/co/master/common-code/groups/2/items/3").principal(authenticationFor()))
                .andExpect(status().isOk());
        mockMvc.perform(write(post("/api/v1/co/master/common-code/save-batch"), "{}"))
                .andExpect(status().isForbidden());

        allow(new MenuPermissionVO(false, true, false, true));
        mockMvc.perform(write(post("/api/v1/co/master/common-code/save-batch"),
                "{\"groups\":{\"deletedRows\":[{\"id\":\"2\"}]},"
                        + "\"items\":{\"deletedRows\":[{\"id\":\"3\",\"groupId\":\"2\"}]}}"))
                .andExpect(status().isOk());

        verify(commonCodeGroupService).deleteGroup(1L, 2L);
        verify(commonCodeItemService).deleteItem(1L, 2L, 3L);
        verify(commonCodeBatchService).saveBatch(eq(1L), any());
    }

    @Test
    void writePermissionDoesNotGrantSingleDeletePermission() throws Exception {
        allow(new MenuPermissionVO(false, true, true, false));

        mockMvc.perform(delete("/api/v1/co/master/common-code/groups/2").principal(authenticationFor()))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/co/master/common-code/groups/2/items/3").principal(authenticationFor()))
                .andExpect(status().isForbidden());

        verifyNoInteractions(commonCodeGroupService, commonCodeItemService);
    }

    @Test
    void nullChangeSetsRemainValidForWritePermission() throws Exception {
        allow(new MenuPermissionVO(false, true, false, false));

        mockMvc.perform(write(post("/api/v1/co/master/common-code/save-batch"), "{\"groups\":null,\"items\":null}"))
                .andExpect(status().isOk());
        verify(commonCodeBatchService).saveBatch(eq(1L), any());
    }

    @Test
    void unauthenticatedAndInvalidTenantRequestsAreRejectedBeforeServices() throws Exception {
        mockMvc.perform(post("/api/v1/co/master/common-code/save-batch")
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        for (Long tenantId : new Long[] {null, 0L, -1L}) {
            user.setTenantId(tenantId);
            mockMvc.perform(write(post("/api/v1/co/master/common-code/save-batch"), "{}"))
                    .andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(systemMenuService, commonCodeBatchService, commonCodeGroupService, commonCodeItemService);
    }

    private void assertChangesForbidden() throws Exception {
        mockMvc.perform(write(post("/api/v1/co/master/common-code/save-batch"), "{}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(write(post("/api/v1/co/master/common-code/groups"), "{}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(write(put("/api/v1/co/master/common-code/groups/2"), "{}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(write(post("/api/v1/co/master/common-code/groups/2/items"), "{}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(write(put("/api/v1/co/master/common-code/groups/2/items/3"), "{}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/co/master/common-code/groups/2").principal(authenticationFor()))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/co/master/common-code/groups/2/items/3").principal(authenticationFor()))
                .andExpect(status().isForbidden());
    }

    private MockHttpServletRequestBuilder write(MockHttpServletRequestBuilder request, String payload) {
        return request.principal(authenticationFor()).contentType(MediaType.APPLICATION_JSON).content(payload);
    }

    private void allow(MenuPermissionVO permissions) throws Exception {
        allow("/co", "/co/master/common-code", permissions);
    }

    private void allow(String modulePath, String pagePath, MenuPermissionVO permissions) throws Exception {
        MenuTreeNodeVO page = new MenuTreeNodeVO();
        page.setPath(pagePath);
        page.setPermissions(permissions);
        MenuTreeNodeVO folder = new MenuTreeNodeVO();
        folder.setPath("/co/master");
        folder.setChildren(Collections.singletonList(page));
        MenuTreeNodeVO module = new MenuTreeNodeVO();
        module.setPath(modulePath);
        module.setChildren(Collections.singletonList(folder));
        MyMenuResponseVO tree = new MyMenuResponseVO();
        tree.setMenus(Collections.singletonList(module));
        org.mockito.Mockito.lenient().when(systemMenuService.getMyMenuTree(
                user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode())).thenReturn(tree);
    }

    private UsernamePasswordAuthenticationToken authenticationFor() {
        return new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList());
    }

    private static class AuthenticationPrincipalResolver implements HandlerMethodArgumentResolver {
        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
        }

        @Override
        public Object resolveArgument(
                MethodParameter parameter,
                ModelAndViewContainer modelAndViewContainer,
                NativeWebRequest webRequest,
                org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
            return webRequest.getUserPrincipal() == null ? null
                    : ((UsernamePasswordAuthenticationToken) webRequest.getUserPrincipal()).getPrincipal();
        }
    }
}
