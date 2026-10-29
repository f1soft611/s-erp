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
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceService;

class ItemPartnerPriceApiControllerTest {
    private final ItemPartnerPriceService service = mock(ItemPartnerPriceService.class);
    private final ItemPartnerPriceBatchService batch = mock(ItemPartnerPriceBatchService.class);
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(
                new ItemPartnerPriceApiController(new ResultVoHelper(), service, batch))
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
                .param("tenantId", "888").param("keyword", "grain").principal(user("TENANT_USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList").isArray());
        verify(service).listPrices(eq(9L), argThat(condition -> "grain".equals(condition.getKeyword())));

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
    }
}
