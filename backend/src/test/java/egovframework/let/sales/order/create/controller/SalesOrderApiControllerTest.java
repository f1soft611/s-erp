package egovframework.let.sales.order.create.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.core.MethodParameter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.bind.support.WebDataBinderFactory;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.order.create.domain.model.SalesOrderCreateRequestVO;
import egovframework.let.sales.order.create.domain.model.SalesOrderVO;
import egovframework.let.sales.order.create.service.SalesOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

class SalesOrderApiControllerTest {
    private static final String ROOT = "/api/v1/sales/orders";

    private SalesOrderService service;
    private MockMvc mvc;
    private LoginVO user;

    @BeforeEach
    void setUp() {
        service = mock(SalesOrderService.class);
        user = new LoginVO();
        user.setTenantId(71L);
        user.setId("user01");
        mvc = MockMvcBuilders
                .standaloneSetup(new SalesOrderApiController(new ResultVoHelper(), service))
                .setCustomArgumentResolvers(loginUserResolver())
                .build();
    }

    @Test
    void createReturnsCreatedEnvelopeAndUsesAuthenticatedTenant() throws Exception {
        SalesOrderVO saved = new SalesOrderVO();
        saved.setSalesOrderId(300L);
        saved.setTenantId(71L);
        saved.setOrderNo("SO-20261027-0001");
        saved.setOrderDt(LocalDate.of(2026, 10, 27));
        saved.setCustomerId(10L);
        saved.setTotalAmt(new java.math.BigDecimal("11.17"));
        saved.setDetails(Collections.emptyList());
        when(service.createOrder(eq(71L), eq("user01"), any(SalesOrderCreateRequestVO.class)))
                .thenReturn(saved);

        mvc.perform(post(ROOT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadWithSpoofedTenant()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.result.item.salesOrderId").value(300))
                .andExpect(jsonPath("$.result.item.orderNo").value("SO-20261027-0001"))
                .andExpect(jsonPath("$.result.item.totalAmt").value(11.17));

        verify(service).createOrder(
                eq(71L), eq("user01"), any(SalesOrderCreateRequestVO.class));
    }

    @Test
    void rejectsMissingAuthenticationWithoutCallingService() throws Exception {
        user = null;

        mvc.perform(post(ROOT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload()))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(service);
    }

    @Test
    void documentsSalesOrderEndpointAndModelsForOpenApi() throws Exception {
        assertEquals(
                "egovframework.let.sales.order.create.controller",
                SalesOrderApiController.class.getPackage().getName());
        assertEquals(
                ROOT,
                SalesOrderApiController.class.getAnnotation(RequestMapping.class).value()[0]);

        Method createOrder = SalesOrderApiController.class.getMethod(
                "createOrder", SalesOrderCreateRequestVO.class, LoginVO.class);
        Operation operation = createOrder.getAnnotation(Operation.class);
        assertNotNull(operation);
        assertEquals("수주 등록", operation.summary());
        assertTrue(operation.description().contains("테넌트"));
        assertNotNull(createOrder.getAnnotation(ApiResponses.class));

        Schema requestSchema = SalesOrderCreateRequestVO.class.getAnnotation(Schema.class);
        assertNotNull(requestSchema);
        assertEquals("수주 등록 요청 모델", requestSchema.description());
        assertNotNull(SalesOrderCreateRequestVO.class
                .getDeclaredField("orderDt").getAnnotation(Schema.class));

        Schema responseSchema = SalesOrderVO.class.getAnnotation(Schema.class);
        assertNotNull(responseSchema);
        assertEquals("수주 정보 응답 모델", responseSchema.description());
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

    private String payload() {
        return "{\"orderDt\":\"2026-10-27\",\"customerId\":10,"
                + "\"details\":[{\"materialId\":20,\"orderQty\":2,"
                + "\"unitPrice\":2,\"vatAmt\":1}]}";
    }

    private String payloadWithSpoofedTenant() {
        return "{\"tenantId\":999," + payload().substring(1);
    }
}
