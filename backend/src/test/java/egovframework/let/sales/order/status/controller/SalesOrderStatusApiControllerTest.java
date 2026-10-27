package egovframework.let.sales.order.status.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.MethodParameter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.order.status.domain.model.SalesOrderStatusSearchVO;
import egovframework.let.sales.order.status.domain.model.SalesOrderStatusVO;
import egovframework.let.sales.order.status.service.SalesOrderStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

class SalesOrderStatusApiControllerTest {
    private static final String ROOT = "/api/v1/sales/order-status";

    private SalesOrderStatusService service;
    private MockMvc mvc;
    private LoginVO user;

    @BeforeEach
    void setUp() {
        service = mock(SalesOrderStatusService.class);
        user = new LoginVO();
        user.setTenantId(71L);
        user.setId("user01");
        mvc = MockMvcBuilders
                .standaloneSetup(new SalesOrderStatusApiController(new ResultVoHelper(), service))
                .setCustomArgumentResolvers(loginUserResolver())
                .build();
    }

    @Test
    void searchReturnsFlattenedRowsForTheAuthenticatedTenantWithFilters() throws Exception {
        SalesOrderStatusVO row = new SalesOrderStatusVO();
        row.setSalesOrderId(300L);
        row.setSalesOrderDetailId(450L);
        row.setOrderNo("SO-20261027-0001");
        row.setOrderDt(LocalDate.of(2026, 10, 27));
        row.setCustomerName("거래처 10");
        row.setLineNo(1);
        row.setMaterialCode("M-20");
        row.setTotalAmt(new BigDecimal("220.00"));
        when(service.selectOrderStatusList(eq(71L), any(SalesOrderStatusSearchVO.class)))
                .thenReturn(Collections.singletonList(row));

        mvc.perform(get(ROOT)
                        .param("keyword", "SO-2026")
                        .param("orderDtFrom", "2026-10-01")
                        .param("orderDtTo", "2026-10-31")
                        .param("materialKeyword", "M-20")
                        .param("tenantId", "999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultCnt").value(1))
                .andExpect(jsonPath("$.result.resultList[0].orderNo").value("SO-20261027-0001"))
                .andExpect(jsonPath("$.result.resultList[0].materialCode").value("M-20"))
                .andExpect(jsonPath("$.result.resultList[0].totalAmt").value(220.00));

        ArgumentCaptor<SalesOrderStatusSearchVO> captor =
                ArgumentCaptor.forClass(SalesOrderStatusSearchVO.class);
        verify(service).selectOrderStatusList(eq(71L), captor.capture());
        assertEquals("SO-2026", captor.getValue().getKeyword());
        assertEquals("2026-10-01", captor.getValue().getOrderDtFrom());
        assertEquals("2026-10-31", captor.getValue().getOrderDtTo());
        assertEquals("M-20", captor.getValue().getMaterialKeyword());
    }

    @Test
    void rejectsMissingAuthenticationWithoutCallingService() throws Exception {
        user = null;

        mvc.perform(get(ROOT)).andExpect(status().isUnauthorized());

        verifyNoInteractions(service);
    }

    @Test
    void documentsOrderStatusEndpointAndModelsForOpenApi() throws Exception {
        assertEquals(
                "egovframework.let.sales.order.status.controller",
                SalesOrderStatusApiController.class.getPackage().getName());
        assertEquals(
                ROOT,
                SalesOrderStatusApiController.class.getAnnotation(RequestMapping.class).value()[0]);

        Method search = SalesOrderStatusApiController.class.getMethod(
                "selectOrderStatusList", SalesOrderStatusSearchVO.class, LoginVO.class);
        Operation operation = search.getAnnotation(Operation.class);
        assertNotNull(operation);
        assertEquals("수주현황 조회", operation.summary());
        assertTrue(operation.description().contains("테넌트"));
        assertNotNull(search.getAnnotation(ApiResponses.class));

        assertEquals("수주현황 검색 조건 모델",
                SalesOrderStatusSearchVO.class.getAnnotation(Schema.class).description());
        assertNotNull(SalesOrderStatusSearchVO.class
                .getDeclaredField("orderDtFrom").getAnnotation(Schema.class));
        assertEquals("수주현황 응답 모델",
                SalesOrderStatusVO.class.getAnnotation(Schema.class).description());
        assertNotNull(SalesOrderStatusVO.class
                .getDeclaredField("materialName").getAnnotation(Schema.class));
    }

    private HandlerMethodArgumentResolver loginUserResolver() {
        return new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType() == LoginVO.class;
            }

            @Override
            public Object resolveArgument(
                    MethodParameter parameter,
                    ModelAndViewContainer container,
                    NativeWebRequest request,
                    WebDataBinderFactory factory) {
                return user;
            }
        };
    }
}
