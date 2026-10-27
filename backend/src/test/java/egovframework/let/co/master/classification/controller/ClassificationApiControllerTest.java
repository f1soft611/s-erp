package egovframework.let.co.master.classification.controller;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.classification.domain.model.ClassificationKind;
import egovframework.let.co.master.classification.domain.model.ClassificationVO;
import egovframework.let.co.master.classification.service.ClassificationService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

class ClassificationApiControllerTest {
    private final ClassificationService classifications = mock(ClassificationService.class);
    private final SystemMenuService menus = mock(SystemMenuService.class);
    private MockMvc mvc;
    private LoginVO user;

    @BeforeEach
    void setup() {
        user = new LoginVO();
        user.setTenantId(9L);
        user.setId("test-login");
        user.setUniqId("00101");
        user.setRoleId(7L);
        user.setRoleCode("TENANT_USER");
        mvc = MockMvcBuilders.standaloneSetup(
                new ClassificationApiController(new ResultVoHelper(), classifications, menus))
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
                    }

                    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                            NativeWebRequest request,
                            org.springframework.web.bind.support.WebDataBinderFactory binder) {
                        return request.getUserPrincipal() == null ? null
                                : ((UsernamePasswordAuthenticationToken) request.getUserPrincipal()).getPrincipal();
                    }
                }).build();
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void getAllowsEachRelevantReadCreateOrUpdatePermission(ClassificationKind kind) throws Exception {
        ClassificationVO row = row();
        when(classifications.list(kind, 9L)).thenReturn(List.of(row));
        for (MenuPermissionVO permission : List.of(
                new MenuPermissionVO(true, false, false, false),
                new MenuPermissionVO(false, true, false, false),
                new MenuPermissionVO(false, false, true, false))) {
            allow(kind, permission);
            mvc.perform(auth(get(path(kind)).param("tenantId", "888").param("userId", "forged")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.resultCode").value(200))
                    .andExpect(jsonPath("$.result.resultList[0].id").value(11))
                    .andExpect(jsonPath("$.result.resultList[0].tenantId").doesNotExist());
        }
        verify(classifications, times(3)).list(kind, 9L);
        verify(menus, times(3)).getMyMenuTree(9L, "test-login", 7L, "TENANT_USER");
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void postAllowsNonAdminAndUsesOnlyAuthenticatedTenantAndActor(ClassificationKind kind) throws Exception {
        allow(kind, new MenuPermissionVO(false, true, false, false));
        when(classifications.create(eq(kind), eq(9L), eq("00101"), any())).thenReturn(row());
        mvc.perform(auth(post(path(kind))).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"New\",\"parentId\":4,\"sortSeq\":2,\"useAt\":\"Y\","
                        + "\"tenantId\":888,\"actorId\":\"forged\",\"createdBy\":\"forged\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.result.item.name").value("Example"))
                .andExpect(jsonPath("$.result.item.createdBy").doesNotExist());
        verify(classifications).create(eq(kind), eq(9L), eq("00101"),
                argThat(p -> "New".equals(p.getName()) && p.getParentId() == 4L
                        && p.getSortSeq() == 2 && "Y".equals(p.getUseAt())));
        verify(menus).getMyMenuTree(9L, "test-login", 7L, "TENANT_USER");
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void putAllowsNonAdminAndPassesAuthenticatedScopeAndPathId(ClassificationKind kind) throws Exception {
        allow(kind, new MenuPermissionVO(false, false, true, false));
        when(classifications.update(eq(kind), eq(9L), eq("00101"), eq(11L), any())).thenReturn(row());
        mvc.perform(auth(put(path(kind) + "/11")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Edited\",\"sortSeq\":3,\"useAt\":\"N\",\"tenantId\":888,\"updatedBy\":\"forged\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.item.id").value(11));
        verify(classifications).update(eq(kind), eq(9L), eq("00101"), eq(11L),
                argThat(p -> "Edited".equals(p.getName()) && p.getSortSeq() == 3 && "N".equals(p.getUseAt())));
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void missingPermissionDeniesAllOperationsEvenForAdminRole(ClassificationKind kind) throws Exception {
        user.setRoleCode("TENANT_ADMIN");
        for (MenuPermissionVO permission : List.of(
                new MenuPermissionVO(), new MenuPermissionVO(false, false, false, true, true))) {
            allow(kind, permission);
            assertForbiddenOperations(kind);
        }
        verifyNoInteractions(classifications);
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void readDoesNotGrantWritesAndWritePermissionsAreOperationSpecific(ClassificationKind kind) throws Exception {
        allow(kind, new MenuPermissionVO(true, false, false, false));
        mvc.perform(auth(post(path(kind))).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(auth(put(path(kind) + "/11")).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        allow(kind, new MenuPermissionVO(false, true, false, false));
        mvc.perform(auth(put(path(kind) + "/11")).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        allow(kind, new MenuPermissionVO(false, false, true, false));
        mvc.perform(auth(post(path(kind))).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(classifications);
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void otherClassificationAndOtherModuleCannotAuthorizeOperations(ClassificationKind kind) throws Exception {
        allow(kind == ClassificationKind.ITEM ? ClassificationKind.PARTNER : ClassificationKind.ITEM,
                new MenuPermissionVO(true, true, true, false));
        assertForbiddenOperations(kind);
        tree("/sales", "/sales/master/" + page(kind), new MenuPermissionVO(true, true, true, false));
        assertForbiddenOperations(kind);
        tree("/co", "/co/master/not-" + page(kind), new MenuPermissionVO(true, true, true, false));
        assertForbiddenOperations(kind);
        verifyNoInteractions(classifications);
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void missingMenuTreeDeniesAccess(ClassificationKind kind) throws Exception {
        assertForbiddenOperations(kind);
        when(menus.getMyMenuTree(any(), any(), any(), any())).thenReturn(new MyMenuResponseVO());
        assertForbiddenOperations(kind);
        verifyNoInteractions(classifications);
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void missingOrInvalidAuthenticatedTenantReturnsUnauthorized(ClassificationKind kind) throws Exception {
        mvc.perform(get(path(kind))).andExpect(status().isUnauthorized());
        mvc.perform(post(path(kind)).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put(path(kind) + "/11").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        for (Long tenant : new Long[] { null, 0L, -1L }) {
            user.setTenantId(tenant);
            mvc.perform(auth(get(path(kind)))).andExpect(status().isUnauthorized());
            mvc.perform(auth(post(path(kind))).contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isUnauthorized());
            mvc.perform(auth(put(path(kind) + "/11")).contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(classifications, menus);
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void invalidActorCannotBeReplacedByPayload(ClassificationKind kind) throws Exception {
        allow(kind, new MenuPermissionVO(true, true, true, false));
        for (String actor : new String[] { null, " ", "12345678901" }) {
            user.setUniqId(actor);
            mvc.perform(auth(post(path(kind))).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"New\",\"actorId\":\"forged\"}")).andExpect(status().isUnauthorized());
            mvc.perform(auth(put(path(kind) + "/11")).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"New\",\"actorId\":\"forged\"}")).andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(classifications);
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void serviceInputErrorsUseStandard400EnvelopeForBothWrites(ClassificationKind kind) throws Exception {
        allow(kind, new MenuPermissionVO(true, true, true, false));
        when(classifications.create(eq(kind), eq(9L), eq("00101"), any()))
                .thenThrow(new IllegalArgumentException("Invalid classification"));
        when(classifications.update(eq(kind), eq(9L), eq("00101"), eq(11L), any()))
                .thenThrow(new IllegalArgumentException("Invalid classification"));
        for (MockHttpServletRequestBuilder request : List.of(post(path(kind)), put(path(kind) + "/11"))) {
            mvc.perform(auth(request).contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.resultCode").value(900))
                    .andExpect(jsonPath("$.resultMessage").value("Invalid classification"));
        }
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void malformedPayloadReturns400WithoutServiceCall(ClassificationKind kind) throws Exception {
        for (String payload : List.of("{", "{\"sortSeq\":\"invalid\"}", "null")) {
            mvc.perform(auth(post(path(kind))).contentType(MediaType.APPLICATION_JSON).content(payload))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.resultCode").value(900));
            mvc.perform(auth(put(path(kind) + "/11")).contentType(MediaType.APPLICATION_JSON).content(payload))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.resultCode").value(900));
        }
        verifyNoInteractions(classifications);
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void nonnumericTargetIdReturnsStandardInputErrorWithoutServiceCall(ClassificationKind kind) throws Exception {
        mvc.perform(auth(put(path(kind) + "/not-a-number")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Edited\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.resultCode").value(900))
                .andExpect(jsonPath("$.resultMessage").value("분류 ID는 정수여야 합니다."))
                .andExpect(jsonPath("$.result.message").value("분류 ID는 정수여야 합니다."));
        verifyNoInteractions(classifications, menus);
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void missingOrForeignTargetAndParentRemain404(ClassificationKind kind) throws Exception {
        allow(kind, new MenuPermissionVO(true, true, true, false));
        when(classifications.create(eq(kind), eq(9L), eq("00101"), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));
        when(classifications.update(eq(kind), eq(9L), eq("00101"), anyLong(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));
        for (long id : new long[] { 404L, 888L }) {
            mvc.perform(auth(post(path(kind))).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"New\",\"parentId\":" + id + "}")).andExpect(status().isNotFound());
            mvc.perform(auth(put(path(kind) + "/" + id)).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"New\"}")).andExpect(status().isNotFound());
        }
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void unexpectedServiceAndMenuErrorsAreNotSuccessfulOrInputErrors(ClassificationKind kind) throws Exception {
        allow(kind, new MenuPermissionVO(true, true, true, false));
        IllegalStateException failure = new IllegalStateException("Unexpected failure");
        when(classifications.list(kind, 9L)).thenThrow(failure);
        when(classifications.create(eq(kind), eq(9L), eq("00101"), any())).thenThrow(failure);
        when(classifications.update(eq(kind), eq(9L), eq("00101"), eq(11L), any())).thenThrow(failure);
        for (MockHttpServletRequestBuilder request : List.of(get(path(kind)),
                post(path(kind)).contentType(MediaType.APPLICATION_JSON).content("{}"),
                put(path(kind) + "/11").contentType(MediaType.APPLICATION_JSON).content("{}"))) {
            Exception ex = assertThrows(Exception.class, () -> mvc.perform(auth(request)));
            assertSame(failure, ex.getCause());
        }
        when(menus.getMyMenuTree(any(), any(), any(), any())).thenThrow(failure);
        Exception ex = assertThrows(Exception.class, () -> mvc.perform(auth(get(path(kind)))));
        assertSame(failure, ex.getCause());
    }

    private void assertForbiddenOperations(ClassificationKind kind) throws Exception {
        mvc.perform(auth(get(path(kind)))).andExpect(status().isForbidden());
        mvc.perform(auth(post(path(kind))).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(auth(put(path(kind) + "/11")).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }

    private void allow(ClassificationKind kind, MenuPermissionVO permission) throws Exception {
        tree("//co/", "/co/master/" + page(kind) + "/", permission);
    }

    private void tree(String modulePath, String pagePath, MenuPermissionVO permission) throws Exception {
        MenuTreeNodeVO leaf = new MenuTreeNodeVO();
        leaf.setPath(pagePath);
        leaf.setPermissions(permission);
        MenuTreeNodeVO group = new MenuTreeNodeVO();
        group.setPath("/co/master");
        group.setChildren(List.of(leaf));
        MenuTreeNodeVO module = new MenuTreeNodeVO();
        module.setPath(modulePath);
        module.setChildren(List.of(group));
        MyMenuResponseVO response = new MyMenuResponseVO();
        response.setMenus(List.of(module));
        when(menus.getMyMenuTree(eq(9L), eq("test-login"), eq(7L), any())).thenReturn(response);
    }

    private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder request) {
        return request.principal(new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList()));
    }

    private String path(ClassificationKind kind) {
        return "/api/v1/co/master/classifications/" + (kind == ClassificationKind.ITEM ? "items" : "partners");
    }

    private String page(ClassificationKind kind) {
        return kind == ClassificationKind.ITEM ? "materials" : "customers";
    }

    private ClassificationVO row() {
        ClassificationVO row = new ClassificationVO();
        row.setId(11L);
        row.setName("Example");
        row.setLevel(1);
        row.setSortSeq(0);
        row.setUseAt("Y");
        return row;
    }
}
