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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

    @Test
    void loadsUpdatesAndDeletesOrdersWithinTheAuthenticatedTenant() throws Exception {
        SalesOrderVO stored = new SalesOrderVO();
        stored.setSalesOrderId(300L);
        stored.setOrderNo("SO-20261027-0001");
        stored.setCustomerCode("C-10");
        stored.setDetails(Collections.emptyList());
        when(service.getOrder(71L, 300L)).thenReturn(stored);
        when(service.updateOrder(eq(71L), eq("user01"), eq(300L), any(SalesOrderCreateRequestVO.class)))
                .thenReturn(stored);

        mvc.perform(get(ROOT + "/300"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.orderNo").value("SO-20261027-0001"))
                .andExpect(jsonPath("$.result.item.customerCode").value("C-10"));

        mvc.perform(put(ROOT + "/300")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadWithSpoofedTenant()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.salesOrderId").value(300))
                .andExpect(jsonPath("$.result.message").value("수주가 성공적으로 수정되었습니다."));

        mvc.perform(delete(ROOT + "/300"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.message").value("수주가 성공적으로 삭제되었습니다."));

        verify(service).deleteOrder(71L, "user01", 300L);
    }

    @Test
    void documentsLoadUpdateAndDeleteEndpoints() throws Exception {
        Method getOrder = SalesOrderApiController.class.getMethod("getOrder", Long.class, LoginVO.class);
        Method updateOrder = SalesOrderApiController.class.getMethod(
                "updateOrder", Long.class, SalesOrderCreateRequestVO.class, LoginVO.class);
        Method deleteOrder = SalesOrderApiController.class.getMethod("deleteOrder", Long.class, LoginVO.class);

        assertEquals("수주 조회", getOrder.getAnnotation(Operation.class).summary());
        assertEquals("수주 수정", updateOrder.getAnnotation(Operation.class).summary());
        assertEquals("수주 삭제", deleteOrder.getAnnotation(Operation.class).summary());
        for (Method method : new Method[] { getOrder, updateOrder, deleteOrder }) {
            assertNotNull(method.getAnnotation(ApiResponses.class));
        }
        assertNotNull(SalesOrderVO.class.getDeclaredField("customerName").getAnnotation(Schema.class));
        assertNotNull(egovframework.let.sales.order.create.domain.model.SalesOrderDetailVO.class
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

    private String payload() {
        return "{\"orderDt\":\"2026-10-27\",\"customerId\":10,"
                + "\"details\":[{\"materialId\":20,\"orderQty\":2,"
                + "\"unitPrice\":2,\"vatAmt\":1}]}";
    }

    private String payloadWithSpoofedTenant() {
        return "{\"tenantId\":999," + payload().substring(1);
    }
}
