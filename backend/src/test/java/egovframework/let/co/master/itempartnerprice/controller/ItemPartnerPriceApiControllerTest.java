package egovframework.let.co.master.itempartnerprice.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.bind.support.WebDataBinderFactory;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchSaveResultVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportValidationVO;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceBatchService;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceOverviewService;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceService;
import egovframework.let.co.master.itempartnerprice.service.ItemPriceAccessService;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class ItemPartnerPriceApiControllerTest {
    private final ItemPartnerPriceService service = mock(ItemPartnerPriceService.class);
    private final ItemPartnerPriceBatchService batch = mock(ItemPartnerPriceBatchService.class);
    private final ItemPartnerPriceOverviewService overview = mock(ItemPartnerPriceOverviewService.class);
    private final ItemPriceAccessService access = mock(ItemPriceAccessService.class);
    private MockMvc mvc;

    @BeforeEach
    void setup() throws Exception {
        when(access.requirePermission(any(), any(), any())).thenReturn(9L);
        mvc = MockMvcBuilders.standaloneSetup(
                new ItemPartnerPriceApiController(new ResultVoHelper(), service, batch, overview, access))
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    @Override
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
                    }

                    @Override
                    public Object resolveArgument(MethodParameter parameter,
                            ModelAndViewContainer container, NativeWebRequest request,
                            WebDataBinderFactory binderFactory) {
                        return ((UsernamePasswordAuthenticationToken) request.getUserPrincipal()).getPrincipal();
                    }
                }).build();
    }

    private UsernamePasswordAuthenticationToken user(String role) {
        LoginVO user = new LoginVO();
        user.setTenantId(9L);
        user.setUniqId("00101");
        user.setRoleCode(role);
        return new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList());
    }

    @Test
    void listAndImportPreflightUseAuthenticatedTenant() throws Exception {
        when(service.listPrices(eq(9L), any())).thenReturn(Collections.emptyList());
        when(service.validateImport(eq(9L), anyList())).thenReturn(new ItemPartnerPriceImportValidationVO());

        mvc.perform(get("/api/v1/co/master/item-partner-prices")
                .param("tenantId", "888").param("keyword", "grain").param("tradeType", "매입").principal(user("TENANT_USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList").isArray());
        verify(service).listPrices(eq(9L), argThat(condition -> "grain".equals(condition.getKeyword())));
        verify(access).requirePermission(any(), eq("매입"), eq(ItemPriceAccessService.Operation.READ));

        mvc.perform(post("/api/v1/co/master/item-partner-prices/validate-import")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rows\":[{\"sourceRowNumber\":2,\"tradeType\":\"매입\","
                        + "\"materialCode\":\"000101\",\"customerCode\":\"000201\","
                        + "\"unitPrice\":\"1\",\"startDt\":\"2026-10-01\"}]}")
                .principal(user("TENANT_USER")))
                .andExpect(status().isOk());
        verify(service).validateImport(eq(9L), argThat(rows -> rows.size() == 1
                && "000101".equals(rows.get(0).getMaterialCode())));
    }

    @Test
    void overviewUsesAuthenticatedTenantAndMapsConditions() throws Exception {
        when(overview.listOverview(eq(9L), any())).thenReturn(Collections.emptyList());

        mvc.perform(get("/api/v1/co/master/item-partner-prices/overview")
                .param("tenantId", "888").param("keyword", "flour").param("priceFilter", "NO_COMMON_PRICE").param("tradeType", "매출")
                .principal(user("TENANT_USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList").isArray());
        verify(overview).listOverview(eq(9L), argThat(condition ->
                "flour".equals(condition.getKeyword()) && "NO_COMMON_PRICE".equals(condition.getPriceFilter())
                        && "매출".equals(condition.getTradeType())));
        verify(access).requirePermission(any(), eq("매출"), eq(ItemPriceAccessService.Operation.READ));
        verifyNoInteractions(service);
    }

    @Test
    void customerOverviewUsesAuthenticatedTenantAndMapsConditions() throws Exception {
        when(overview.listCustomerOverview(eq(9L), any())).thenReturn(Collections.emptyList());

        mvc.perform(get("/api/v1/co/master/item-partner-prices/customer-overview")
                .param("tenantId", "888").param("keyword", "abc").param("registerFilter", "UNREGISTERED").param("tradeType", "매입")
                .principal(user("TENANT_USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList").isArray());
        verify(overview).listCustomerOverview(eq(9L), argThat(condition ->
                "abc".equals(condition.getKeyword()) && "UNREGISTERED".equals(condition.getRegisterFilter())));
    }

    @Test
    void batchSaveRequiresAdminAndUsesPrincipalActor() throws Exception {
        mvc.perform(post("/api/v1/co/master/item-partner-prices/save-batch")
                .contentType(MediaType.APPLICATION_JSON).content("{}").principal(user("TENANT_USER")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(batch);
        when(batch.saveBatch(eq(9L), eq("00101"), any())).thenReturn(new ItemPartnerPriceBatchSaveResultVO());

        mvc.perform(post("/api/v1/co/master/item-partner-prices/save-batch")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"prices\":{\"insertedRows\":[],\"updatedRows\":[],\"deletedRows\":[]}}")
                .principal(user("TENANT_ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.prices").isArray());
        verify(batch).saveBatch(eq(9L), eq("00101"), any());
        verify(access).requireBatchPermission(any(), any());
    }

    @Test
    void deniedTradeTypePermissionReturns403WithoutCallingServices() throws Exception {
        when(access.requirePermission(any(), eq("매입"), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "권한 없음"));

        mvc.perform(get("/api/v1/co/master/item-partner-prices/overview").param("tradeType", "매입")
                .principal(user("TENANT_USER")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/co/master/item-partner-prices/customer-overview").param("tradeType", "매입")
                .principal(user("TENANT_USER")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/co/master/item-partner-prices").param("tradeType", "매입")
                .principal(user("TENANT_USER")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(overview);
        verifyNoInteractions(service);
    }

    @Test
    void missingTradeTypeIsABadRequest() throws Exception {
        when(access.requirePermission(any(), isNull(), any()))
                .thenThrow(new IllegalArgumentException("거래구분은 매입 또는 매출이어야 합니다."));

        mvc.perform(get("/api/v1/co/master/item-partner-prices/overview").principal(user("TENANT_USER")))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(overview);
    }

    @Test
    void deniedBatchOrImportPermissionStopsBeforeSavingOrValidating() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "권한 없음"))
                .when(access).requireBatchPermission(any(), any());
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "권한 없음"))
                .when(access).requireImportPermission(any(), anyList());

        mvc.perform(post("/api/v1/co/master/item-partner-prices/save-batch")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"prices\":{\"insertedRows\":[],\"updatedRows\":[],\"deletedRows\":[]}}")
                .principal(user("TENANT_ADMIN")))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/co/master/item-partner-prices/validate-import")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rows\":[{\"sourceRowNumber\":2,\"tradeType\":\"매출\"}]}")
                .principal(user("TENANT_USER")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(batch);
        verifyNoInteractions(service);
    }
}
