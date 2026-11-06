package egovframework.let.system.policies.controller;

import static org.assertj.core.api.Assertions.assertThat;
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

import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.node.BooleanNode;
import com.fasterxml.jackson.databind.node.IntNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.TextNode;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.system.policies.domain.model.SystemPolicyHistoryVO;
import egovframework.let.system.policies.domain.model.SystemPolicyOptionVO;
import egovframework.let.system.policies.domain.model.SystemPolicySaveRequestVO;
import egovframework.let.system.policies.domain.model.SystemPolicyUserVO;
import egovframework.let.system.policies.domain.model.SystemPolicyVO;
import egovframework.let.system.policies.service.SystemPolicyService;

@ExtendWith(MockitoExtension.class)
class SystemPolicyApiControllerTest {

    private static final String BASE = "/api/v1/system/policies";

    @Mock
    private SystemPolicyService systemPolicyService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        SystemPolicyApiController controller = new SystemPolicyApiController(new ResultVoHelper(), systemPolicyService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
                .build();
    }

    @Test
    void listReturnsExplicitFalseZeroAndEmptyListValuesForPlatformAdmin() throws Exception {
        SystemPolicyVO bool = policy(1L, "FLAG", "BOOLEAN");
        bool.setValue(BooleanNode.FALSE);
        SystemPolicyVO number = policy(2L, "LIMIT", "NUMBER");
        number.setValue(IntNode.valueOf(0));
        SystemPolicyVO users = policy(3L, "APPROVERS", "USER_LIST");
        users.setValue(JsonNodeFactory.instance.arrayNode());
        SystemPolicyVO mode = policy(4L, "DELIVERY_PLAN_MODE", "SELECT");
        mode.setValue(TextNode.valueOf("MANUAL"));
        mode.setSystemPolicy(true);
        mode.setOptions(Arrays.asList(new SystemPolicyOptionVO("AUTO", "자동"), new SystemPolicyOptionVO("MANUAL", "수동")));
        when(systemPolicyService.listPolicies(1L)).thenReturn(Arrays.asList(bool, number, users, mode));

        mockMvc.perform(get(BASE).principal(auth("PLATFORM_ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList.length()").value(4))
                .andExpect(jsonPath("$.result.resultList[0].value").value(false))
                .andExpect(jsonPath("$.result.resultList[0].policyId").value(1))
                .andExpect(jsonPath("$.result.resultList[0].systemPolicy").value(false))
                .andExpect(jsonPath("$.result.resultList[0].minValue").isEmpty())
                .andExpect(jsonPath("$.result.resultList[0].valueJson").doesNotExist())
                .andExpect(jsonPath("$.result.resultList[0].optionsJson").doesNotExist())
                .andExpect(jsonPath("$.result.resultList[1].value").value(0))
                .andExpect(jsonPath("$.result.resultList[2].value").isArray())
                .andExpect(jsonPath("$.result.resultList[2].value.length()").value(0))
                .andExpect(jsonPath("$.result.resultList[3].systemPolicy").value(true))
                .andExpect(jsonPath("$.result.resultList[3].options[1].value").value("MANUAL"))
                .andExpect(jsonPath("$.result.resultList[3].options[1].label").value("수동"))
                .andExpect(jsonPath("$.result.resultList[3].version").value(3))
                .andExpect(jsonPath("$.result.resultList[3].updatedAt").value("2026-11-05T10:00:00"));
    }

    @Test
    void tenantAdminsLegacyAdminsUsersAndAnonymousRolesAreRejectedOnEveryEndpoint() throws Exception {
        for (String role : new String[] { "TENANT_ADMIN", "ADMIN", "TENANT_USER", null }) {
            for (RequestBuilder request : new RequestBuilder[] {
                    get(BASE).principal(auth(role)),
                    post(BASE).principal(auth(role)).contentType(MediaType.APPLICATION_JSON).content(body()),
                    put(BASE + "/5").principal(auth(role)).contentType(MediaType.APPLICATION_JSON).content(body()),
                    delete(BASE + "/5").param("version", "1").principal(auth(role)),
                    get(BASE + "/5/history").principal(auth(role)),
                    get(BASE + "/users").param("keyword", "kim").principal(auth(role))
            }) {
                mockMvc.perform(request).andExpect(status().isForbidden());
            }
        }
        verifyNoInteractions(systemPolicyService);
    }

    @Test
    void writesRequireNumericActorFromLogin() throws Exception {
        UsernamePasswordAuthenticationToken noActor = auth("PLATFORM_ADMIN");
        ((LoginVO) noActor.getPrincipal()).setUniqId(null);
        mockMvc.perform(post(BASE).principal(noActor).contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isForbidden());
        verifyNoInteractions(systemPolicyService);
    }

    @Test
    void createUsesTenantAndActorFromLoginAndIgnoresPayloadTenant() throws Exception {
        SystemPolicyVO created = policy(9L, "FLAG", "BOOLEAN");
        created.setValue(BooleanNode.FALSE);
        when(systemPolicyService.createPolicy(eq(1L), eq(42L), any(SystemPolicySaveRequestVO.class))).thenReturn(created);

        mockMvc.perform(post(BASE).principal(auth("PLATFORM_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tenantId\":999,\"policyCode\":\"FLAG\",\"policyName\":\"플래그\","
                                + "\"category\":\"공통\",\"valueType\":\"BOOLEAN\",\"value\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.policyId").value(9))
                .andExpect(jsonPath("$.result.item.value").value(false));

        ArgumentCaptor<SystemPolicySaveRequestVO> captor = ArgumentCaptor.forClass(SystemPolicySaveRequestVO.class);
        verify(systemPolicyService).createPolicy(eq(1L), eq(42L), captor.capture());
        assertThat(captor.getValue().getValue().isBoolean()).isTrue();
        assertThat(captor.getValue().getValue().booleanValue()).isFalse();
    }

    @Test
    void updatePassesVersionAndStaleVersionReturnsConflict() throws Exception {
        when(systemPolicyService.updatePolicy(eq(1L), eq(42L), eq(5L), any(SystemPolicySaveRequestVO.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "stale"));

        mockMvc.perform(put(BASE + "/5").principal(auth("PLATFORM_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"NUMBER\",\"value\":0,\"version\":2}"))
                .andExpect(status().isConflict());

        ArgumentCaptor<SystemPolicySaveRequestVO> captor = ArgumentCaptor.forClass(SystemPolicySaveRequestVO.class);
        verify(systemPolicyService).updatePolicy(eq(1L), eq(42L), eq(5L), captor.capture());
        assertThat(captor.getValue().getVersion()).isEqualTo(2);
    }

    @Test
    void deleteRequiresVersionAndPassesItToService() throws Exception {
        mockMvc.perform(delete(BASE + "/5").principal(auth("PLATFORM_ADMIN")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(delete(BASE + "/5").param("version", "4").principal(auth("PLATFORM_ADMIN")))
                .andExpect(status().isOk());
        verify(systemPolicyService).deletePolicy(1L, 42L, 5L, 4);
    }

    @Test
    void historyAndUserSearchUseResultListContracts() throws Exception {
        SystemPolicyHistoryVO history = new SystemPolicyHistoryVO();
        history.setAction("UPDATE");
        history.setChangedBy("관리자");
        history.setChangedAt("2026-11-05T10:00:00");
        history.setBeforeValue(BooleanNode.TRUE);
        history.setAfterValue(BooleanNode.FALSE);
        when(systemPolicyService.listHistory(1L, 5L)).thenReturn(Collections.singletonList(history));
        SystemPolicyUserVO user = new SystemPolicyUserVO();
        user.setUserId(7L);
        user.setUserName("홍길동");
        when(systemPolicyService.searchUsers(1L, "홍")).thenReturn(Collections.singletonList(user));

        mockMvc.perform(get(BASE + "/5/history").principal(auth("PLATFORM_ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList[0].action").value("UPDATE"))
                .andExpect(jsonPath("$.result.resultList[0].changedBy").value("관리자"))
                .andExpect(jsonPath("$.result.resultList[0].beforeValue").value(true))
                .andExpect(jsonPath("$.result.resultList[0].afterValue").value(false))
                .andExpect(jsonPath("$.result.resultList[0].beforeValueJson").doesNotExist());
        mockMvc.perform(get(BASE + "/users").param("keyword", "홍").principal(auth("PLATFORM_ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList[0].userId").value(7))
                .andExpect(jsonPath("$.result.resultList[0].userName").value("홍길동"))
                .andExpect(jsonPath("$.result.resultList[0].length()").value(2));
    }

    private String body() {
        return "{\"policyCode\":\"FLAG\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"BOOLEAN\",\"value\":true,\"version\":1}";
    }

    private SystemPolicyVO policy(Long id, String code, String type) {
        SystemPolicyVO vo = new SystemPolicyVO();
        vo.setPolicyId(id);
        vo.setPolicyCode(code);
        vo.setPolicyName(code);
        vo.setCategory("공통");
        vo.setDescription("");
        vo.setValueType(type);
        vo.setOptions(Collections.<SystemPolicyOptionVO>emptyList());
        vo.setUnit("");
        vo.setVersion(3);
        vo.setUpdatedAt("2026-11-05T10:00:00");
        vo.setValueJson("ignored");
        vo.setOptionsJson("[]");
        return vo;
    }

    private UsernamePasswordAuthenticationToken auth(String roleCode) {
        LoginVO user = new LoginVO();
        user.setTenantId(1L);
        user.setUniqId("42");
        user.setRoleCode(roleCode);
        return new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList());
    }

    private static class AuthenticationPrincipalResolver implements HandlerMethodArgumentResolver {
        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
        }

        @Override
        public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
            return ((UsernamePasswordAuthenticationToken) webRequest.getUserPrincipal()).getPrincipal();
        }
    }
}