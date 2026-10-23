package egovframework.let.co.master.customer.controller;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.customer.domain.model.CustomerInfoVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoBatchSaveResultVO;
import egovframework.let.co.master.customer.service.CustomerInfoBatchService;
import egovframework.let.co.master.customer.service.CustomerInfoService;

@ExtendWith(MockitoExtension.class)
class CustomerInfoApiControllerTest {

    @Mock
    private CustomerInfoService customerInfoService;

    @Mock
    private CustomerInfoBatchService customerInfoBatchService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        CustomerInfoApiController controller =
                new CustomerInfoApiController(new ResultVoHelper(), customerInfoBatchService, customerInfoService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
                .build();
    }

    @Test
    void saveBatchPassesAuthenticatedTenantAndActor() throws Exception {
        CustomerInfoBatchSaveResultVO result = new CustomerInfoBatchSaveResultVO();
        when(customerInfoBatchService.saveBatch(eq(9L), eq(101L),
                argThat(payload -> payload.getCustomers().getInsertedRows().size() == 1)))
                .thenReturn(result);

        mockMvc.perform(post("/api/v1/co/master/customers/save-batch")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customers\":{\"insertedRows\":[{\"customerId\":\"new-1\",\"customerName\":\"Acme\"}]}}")
                        .principal(authenticationForTenant(9L, "TENANT_ADMIN", "101")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.customers").isArray());
    }

    @Test
    void saveBatchRejectsNonAdminAndReturnsValidationMessage() throws Exception {
        mockMvc.perform(post("/api/v1/co/master/customers/save-batch")
                        .contentType(MediaType.APPLICATION_JSON).content("{}")
                        .principal(authenticationForTenant(9L)))
                .andExpect(status().isForbidden());
        verifyNoInteractions(customerInfoBatchService);

        when(customerInfoBatchService.saveBatch(eq(9L), eq(101L), org.mockito.ArgumentMatchers.any()))
                .thenThrow(new IllegalArgumentException("거래처명은 필수입니다."));
        mockMvc.perform(post("/api/v1/co/master/customers/save-batch")
                        .contentType(MediaType.APPLICATION_JSON).content("{}")
                        .principal(authenticationForTenant(9L, "TENANT_ADMIN", "101")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.resultMessage").value("거래처명은 필수입니다."));
    }

    @Test
    void invalidSearchValueReturnsBadRequestWithValidationMessage() throws Exception {
        when(customerInfoService.listCustomers(eq(9L), org.mockito.ArgumentMatchers.any()))
                .thenThrow(new IllegalArgumentException("사용 여부는 Y 또는 N이어야 합니다."));
        mockMvc.perform(get("/api/v1/co/master/customers")
                        .param("useAt", "X")
                        .principal(authenticationForTenant(9L)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.resultMessage").value("사용 여부는 Y 또는 N이어야 합니다."));
    }

    @Test
    void listCustomersWithoutFiltersUsesTenantOnlyOverload() throws Exception {
        when(customerInfoService.listCustomers(9L)).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/co/master/customers")
                        .principal(authenticationForTenant(9L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList").isArray());
        verify(customerInfoService).listCustomers(9L);
    }

    @Test
    void listCustomersPassesAllFiltersAndAuthenticatedTenant() throws Exception {
        when(customerInfoService.listCustomers(eq(9L), argThat(condition ->
                "Acme".equals(condition.getKeyword())
                        && "Lee".equals(condition.getPresidentName())
                        && "123".equals(condition.getBusinessNo())
                        && "456".equals(condition.getJuridNo())
                        && "Retail".equals(condition.getBusinessStatus1())
                        && "Goods".equals(condition.getBusinessItem1())
                        && "Y".equals(condition.getUseAt()))))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/co/master/customers")
                        .param("keyword", "Acme")
                        .param("presidentName", "Lee")
                        .param("businessNo", "123")
                        .param("juridNo", "456")
                        .param("businessStatus1", "Retail")
                        .param("businessItem1", "Goods")
                        .param("useAt", "Y")
                        .principal(authenticationForTenant(9L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList").isArray());

        verify(customerInfoService).listCustomers(eq(9L), argThat(condition ->
                "Acme".equals(condition.getKeyword())
                        && "Lee".equals(condition.getPresidentName())
                        && "123".equals(condition.getBusinessNo())
                        && "456".equals(condition.getJuridNo())
                        && "Retail".equals(condition.getBusinessStatus1())
                        && "Goods".equals(condition.getBusinessItem1())
                        && "Y".equals(condition.getUseAt())));
    }

    @Test
    void createCustomerPassesAuthenticatedTenantAndActor() throws Exception {
        CustomerInfoVO created = new CustomerInfoVO();
        created.setCustomerId(21L);
        created.setCustomerCode("000021");
        created.setCustomerName("Acme");
        when(customerInfoService.createCustomer(eq(9L), eq(101L), argThat(payload ->
                "Acme".equals(payload.getCustomerName())
                        && "AC".equals(payload.getCustNameAbbr())
                        && "Y".equals(payload.getUseAt()))))
                .thenReturn(created);

        mockMvc.perform(post("/api/v1/co/master/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerCode\":\"\",\"customerName\":\"Acme\",\"custNameAbbr\":\"AC\",\"useAt\":\"Y\"}")
                        .principal(authenticationForTenant(9L, "TENANT_ADMIN", "101")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.result.item.customerId").value(21))
                .andExpect(jsonPath("$.result.item.customerCode").value("000021"));

        verify(customerInfoService).createCustomer(eq(9L), eq(101L), argThat(payload ->
                "Acme".equals(payload.getCustomerName())
                        && "AC".equals(payload.getCustNameAbbr())
                        && "Y".equals(payload.getUseAt())));
    }

    @Test
    void createCustomerReturnsBadRequestForInvalidPayload() throws Exception {
        when(customerInfoService.createCustomer(eq(9L), eq(101L), org.mockito.ArgumentMatchers.any()))
                .thenThrow(new IllegalArgumentException("거래처명은 필수입니다."));

        mockMvc.perform(post("/api/v1/co/master/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"\",\"useAt\":\"Y\"}")
                        .principal(authenticationForTenant(9L, "TENANT_ADMIN", "101")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.resultMessage").value("거래처명은 필수입니다."))
                .andExpect(jsonPath("$.result.message").value("거래처명은 필수입니다."));
    }

    @Test
    void createCustomerRejectsNonAdminBeforeCallingService() throws Exception {
        mockMvc.perform(post("/api/v1/co/master/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"Acme\",\"useAt\":\"Y\"}")
                        .principal(authenticationForTenant(9L)))
                .andExpect(status().isForbidden());

        verifyNoInteractions(customerInfoService);
    }

    @Test
    void createCustomerRejectsMissingNumericActorIdentity() throws Exception {
        mockMvc.perform(post("/api/v1/co/master/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"Acme\",\"useAt\":\"Y\"}")
                        .principal(authenticationForTenant(9L, "TENANT_ADMIN", "invalid")))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(customerInfoService);
    }

    @Test
    void updateCustomerPassesAuthenticatedTenantAndActor() throws Exception {
        CustomerInfoVO updated = new CustomerInfoVO();
        updated.setCustomerId(21L);
        updated.setCustomerCode("000021");
        updated.setCustomerName("Updated Acme");
        updated.setUseAt("N");
        when(customerInfoService.updateCustomer(eq(9L), eq(101L), eq(21L), argThat(payload ->
                "000021".equals(payload.getCustomerCode())
                        && "Updated Acme".equals(payload.getCustomerName())
                        && "N".equals(payload.getUseAt()))))
                .thenReturn(updated);

        mockMvc.perform(put("/api/v1/co/master/customers/21")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerCode\":\"000021\",\"customerName\":\"Updated Acme\",\"useAt\":\"N\"}")
                        .principal(authenticationForTenant(9L, "TENANT_ADMIN", "101")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.customerId").value(21))
                .andExpect(jsonPath("$.result.item.useAt").value("N"));

        verify(customerInfoService).updateCustomer(eq(9L), eq(101L), eq(21L), argThat(payload ->
                "000021".equals(payload.getCustomerCode())
                        && "Updated Acme".equals(payload.getCustomerName())
                        && "N".equals(payload.getUseAt())));
    }

    @Test
    void updateCustomerReturnsNotFoundForMissingOrForeignTenantRow() throws Exception {
        when(customerInfoService.updateCustomer(eq(9L), eq(101L), eq(21L), org.mockito.ArgumentMatchers.any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "거래처를 찾을 수 없습니다."));

        mockMvc.perform(put("/api/v1/co/master/customers/21")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerCode\":\"000021\",\"customerName\":\"Acme\",\"useAt\":\"Y\"}")
                        .principal(authenticationForTenant(9L, "TENANT_ADMIN", "101")))
                .andExpect(status().isNotFound());
    }

    private UsernamePasswordAuthenticationToken authenticationForTenant(Long tenantId) {
        return authenticationForTenant(tenantId, "TENANT_USER", null);
    }

    private UsernamePasswordAuthenticationToken authenticationForTenant(
            Long tenantId,
            String roleCode,
            String userId) {
        LoginVO user = new LoginVO();
        user.setTenantId(tenantId);
        user.setRoleCode(roleCode);
        user.setUniqId(userId);
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
            return ((UsernamePasswordAuthenticationToken) webRequest.getUserPrincipal()).getPrincipal();
        }
    }
}
