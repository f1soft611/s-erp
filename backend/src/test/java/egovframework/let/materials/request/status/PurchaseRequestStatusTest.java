package egovframework.let.materials.request.status;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.MethodParameter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.materials.request.status.controller.PurchaseRequestStatusApiController;
import egovframework.let.materials.request.status.domain.model.PurchaseRequestStatusSearchVO;
import egovframework.let.materials.request.status.domain.model.PurchaseRequestStatusVO;
import egovframework.let.materials.request.status.domain.repository.PurchaseRequestStatusDAO;
import egovframework.let.materials.request.status.service.PurchaseRequestStatusService;
import egovframework.let.materials.request.status.service.impl.PurchaseRequestStatusServiceImpl;

class PurchaseRequestStatusTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/materials/request/status/EgovPurchaseRequestStatus_SQL_postgresql.xml";

    @Test
    void serviceNormalizesFiltersAndAlwaysBindsTenant() throws Exception {
        PurchaseRequestStatusDAO dao = mock(PurchaseRequestStatusDAO.class);
        when(dao.selectRequestStatusList(anyMap())).thenReturn(Collections.<PurchaseRequestStatusVO>emptyList());
        PurchaseRequestStatusSearchVO search = new PurchaseRequestStatusSearchVO();
        search.setKeyword("  MR  ");
        search.setStatus(" ");
        search.setRequestDtFrom("2026-11-01");
        search.setRequestDtTo("2026-11-30");

        new PurchaseRequestStatusServiceImpl(dao).selectRequestStatusList(1L, search);

        @SuppressWarnings({ "unchecked", "rawtypes" })
        ArgumentCaptor<Map<String, Object>> captor = (ArgumentCaptor) ArgumentCaptor.forClass(Map.class);
        verify(dao).selectRequestStatusList(captor.capture());
        assertThat(captor.getValue())
                .containsEntry("tenantId", 1L)
                .containsEntry("keyword", "MR")
                .containsEntry("status", null)
                .containsEntry("requestDtFrom", "2026-11-01")
                .containsEntry("requestDtTo", "2026-11-30");
    }

    @Test
    void serviceRejectsReversedOrInvalidDateRange() {
        PurchaseRequestStatusServiceImpl service = new PurchaseRequestStatusServiceImpl(mock(PurchaseRequestStatusDAO.class));
        PurchaseRequestStatusSearchVO reversed = new PurchaseRequestStatusSearchVO();
        reversed.setRequestDtFrom("2026-11-30");
        reversed.setRequestDtTo("2026-11-01");
        assertThatThrownBy(() -> service.selectRequestStatusList(1L, reversed)).isInstanceOf(ResponseStatusException.class);
        PurchaseRequestStatusSearchVO invalid = new PurchaseRequestStatusSearchVO();
        invalid.setRequestDeliveryDtFrom("2026-13-01");
        assertThatThrownBy(() -> service.selectRequestStatusList(1L, invalid)).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void mapperScopesTenantExcludesDeletedAndJoinsNames() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(RESOURCE)) {
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 1L);
        params.put("keyword", "MR");
        params.put("requestNo", "MR");
        params.put("requesterKeyword", "홍");
        params.put("status", "REQUESTED");
        params.put("materialKeyword", "M");
        params.put("useType", "PRODUCTION");
        params.put("requestDtFrom", "2026-11-01");
        params.put("requestDtTo", "2026-11-30");
        params.put("requestDeliveryDtFrom", "2026-11-01");
        params.put("requestDeliveryDtTo", "2026-11-30");
        BoundSql sql = configuration.getMappedStatement("PurchaseRequestStatusDAO.selectRequestStatusList")
                .getBoundSql(params);
        String text = sql.getSql().replaceAll("\\s+", " ");
        assertThat(text).contains("h.tenant_id = ?", "h.use_at = 'Y'", "tb_purchase_request_dt",
                "PURCHASE_USE_TYPE", "requesterName", "useTypeName",
                "ORDER BY h.request_dt DESC, h.request_no DESC, d.line_no");
        List<String> properties = sql.getParameterMappings().stream()
                .map(item -> item.getProperty()).collect(Collectors.toList());
        assertThat(properties).contains("tenantId", "keyword", "requestNo", "requesterKeyword", "status",
                "materialKeyword", "useType", "requestDtFrom", "requestDtTo",
                "requestDeliveryDtFrom", "requestDeliveryDtTo");
    }

    @Test
    void controllerReturnsListForAuthenticatedTenantOnly() throws Exception {
        PurchaseRequestStatusService service = mock(PurchaseRequestStatusService.class);
        PurchaseRequestStatusVO row = new PurchaseRequestStatusVO();
        row.setRequestNo("MR-20261112-0001");
        when(service.selectRequestStatusList(eq(1L), any(PurchaseRequestStatusSearchVO.class)))
                .thenReturn(Collections.singletonList(row));
        final LoginVO[] user = { new LoginVO() };
        user[0].setTenantId(1L);
        user[0].setId("user01");
        MockMvc mvc = MockMvcBuilders
                .standaloneSetup(new PurchaseRequestStatusApiController(new ResultVoHelper(), service))
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    @Override
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.getParameterType() == LoginVO.class;
                    }

                    @Override
                    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                            NativeWebRequest request, WebDataBinderFactory factory) {
                        return user[0];
                    }
                })
                .build();

        mvc.perform(get("/api/v1/materials/purchase-request-status").param("keyword", "MR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultCnt").value(1))
                .andExpect(jsonPath("$.result.resultList[0].requestNo").value("MR-20261112-0001"));

        user[0] = null;
        PurchaseRequestStatusService untouched = mock(PurchaseRequestStatusService.class);
        mvc = MockMvcBuilders
                .standaloneSetup(new PurchaseRequestStatusApiController(new ResultVoHelper(), untouched))
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    @Override
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.getParameterType() == LoginVO.class;
                    }

                    @Override
                    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                            NativeWebRequest request, WebDataBinderFactory factory) {
                        return null;
                    }
                })
                .build();
        mvc.perform(get("/api/v1/materials/purchase-request-status")).andExpect(status().isUnauthorized());
        verifyNoInteractions(untouched);
    }
}
