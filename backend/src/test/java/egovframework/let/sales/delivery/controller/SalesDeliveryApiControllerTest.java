package egovframework.let.sales.delivery.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.delivery.domain.model.SalesDeliveryStatusSearchVO;
import egovframework.let.sales.delivery.domain.model.SalesDeliveryVO;
import egovframework.let.sales.delivery.service.SalesDeliveryService;

class SalesDeliveryApiControllerTest {
    private static final String ROOT = "/api/v1/sales/deliveries";

    private SalesDeliveryService service;
    private MockMvc mvc;
    private LoginVO user;

    @BeforeEach
    void setUp() {
        service = mock(SalesDeliveryService.class);
        user = new LoginVO();
        user.setTenantId(71L);
        user.setId("user01");
        mvc = MockMvcBuilders.standaloneSetup(
                new SalesDeliveryApiController(new ResultVoHelper(), service))
                .setCustomArgumentResolvers(loginUserResolver())
                .build();
    }

    @Test
    void createReturnsItemAndUsesAuthenticatedTenantAndUser() throws Exception {
        SalesDeliveryVO saved = new SalesDeliveryVO();
        saved.setSalesDeliveryId(501L);
        saved.setDeliveryNo("SD-20261104-0001");
        when(service.createDelivery(eq(71L), eq("user01"),
                any(egovframework.let.sales.delivery.domain.model.SalesDeliveryRequestVO.class)))
                .thenReturn(saved);

        mvc.perform(post(ROOT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deliveryDt\":\"2026-11-04\",\"deliveryType\":\"DIRECT\","
                                + "\"customerId\":10,\"details\":[{\"materialId\":20,"
                                + "\"deliveryQty\":2,\"unitPrice\":100}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.result.item.salesDeliveryId").value(501))
                .andExpect(jsonPath("$.result.item.deliveryNo").value("SD-20261104-0001"));

        verify(service).createDelivery(eq(71L), eq("user01"),
                any(egovframework.let.sales.delivery.domain.model.SalesDeliveryRequestVO.class));
    }

    @Test
    void sourceOrdersAndStatusUseItemsEnvelopeAndPrincipalTenant() throws Exception {
        when(service.listSourceOrders(71L, "SO")).thenReturn(Collections.emptyList());
        when(service.listStatus(eq(71L), eq("user01"), any(SalesDeliveryStatusSearchVO.class)))
                .thenReturn(Collections.emptyList());

        mvc.perform(get(ROOT + "/source-orders").param("keyword", "SO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.items").isArray());
        mvc.perform(get(ROOT + "/status")
                        .param("deliveryDtFrom", "2026-11-01")
                        .param("deliveryDtTo", "2026-11-30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.items").isArray());

        verify(service).listSourceOrders(71L, "SO");
        verify(service).listStatus(eq(71L), eq("user01"), any(SalesDeliveryStatusSearchVO.class));
    }

    @Test
    void refusesRequestsWithoutAuthenticatedPrincipal() throws Exception {
        user = null;

        mvc.perform(get(ROOT + "/source-orders"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(service);
    }

    @Test
    void warningReasonSurvivesExistingErrorEnvelopeAndConfirmationIsDeserialized() throws Exception {
        String warning = "[OVER_DELIVERY_CONFIRM_REQUIRED]계획 기준수량 4, 저장후누적 6, 초과수량 2";
        mvc = MockMvcBuilders.standaloneSetup(
                new SalesDeliveryApiController(new ResultVoHelper(), service))
                .setControllerAdvice(new egovframework.com.cmm.GlobalExceptionHandler())
                .setCustomArgumentResolvers(loginUserResolver()).build();
        when(service.createDelivery(eq(71L), eq("user01"), any()))
                .thenThrow(new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.CONFLICT, warning));

        mvc.perform(post(ROOT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deliveryType\":\"ORDER\",\"overDeliveryConfirmed\":true}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(warning));
        verify(service).createDelivery(eq(71L), eq("user01"),
                org.mockito.ArgumentMatchers.argThat(request -> request.isOverDeliveryConfirmed()));
    }

    private HandlerMethodArgumentResolver loginUserResolver() {
        return new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType() == LoginVO.class;
            }

            @Override
            public Object resolveArgument(MethodParameter parameter,
                    ModelAndViewContainer container, NativeWebRequest request,
                    WebDataBinderFactory factory) {
                return user;
            }
        };
    }
}
