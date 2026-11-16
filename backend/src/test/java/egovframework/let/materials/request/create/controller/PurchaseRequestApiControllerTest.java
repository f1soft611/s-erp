package egovframework.let.materials.request.create.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestSaveRequestVO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestVO;
import egovframework.let.materials.request.create.service.PurchaseRequestService;

class PurchaseRequestApiControllerTest {
    private static final String ROOT = "/api/v1/materials/purchase-requests";
    private static final String PAYLOAD = "{\"tenantId\":999,\"requestDt\":\"2026-11-12\",\"details\":[{"
            + "\"materialId\":101,\"requestQty\":10,\"requestDeliveryDt\":\"2026-11-20\",\"useType\":\"PRODUCTION\"}]}";

    private PurchaseRequestService service;
    private MockMvc mvc;
    private LoginVO user;

    @BeforeEach
    void setUp() {
        service = mock(PurchaseRequestService.class);
        user = new LoginVO();
        user.setTenantId(1L);
        user.setId("user01");
        mvc = MockMvcBuilders
                .standaloneSetup(new PurchaseRequestApiController(new ResultVoHelper(), service))
                .setCustomArgumentResolvers(loginUserResolver())
                .build();
    }

    @Test
    void createUsesAuthenticatedTenantAndReturnsCreated() throws Exception {
        when(service.createRequest(eq(1L), eq("user01"), any(PurchaseRequestSaveRequestVO.class)))
                .thenReturn(stored());

        mvc.perform(post(ROOT).contentType(MediaType.APPLICATION_JSON).content(PAYLOAD))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.result.item.requestNo").value("MR-20261112-0001"))
                .andExpect(jsonPath("$.result.message").value("구매요청이 등록되었습니다."));
        verify(service).createRequest(eq(1L), eq("user01"), any(PurchaseRequestSaveRequestVO.class));
    }

    @Test
    void loadsUpdatesAndDeletesWithinTenant() throws Exception {
        when(service.getRequest(1L, 300L)).thenReturn(stored());
        when(service.updateRequest(eq(1L), eq("user01"), eq(300L), any(PurchaseRequestSaveRequestVO.class)))
                .thenReturn(stored());

        mvc.perform(get(ROOT + "/300"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.status").value("REQUESTED"));
        mvc.perform(put(ROOT + "/300").contentType(MediaType.APPLICATION_JSON).content(PAYLOAD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.message").value("구매요청이 수정되었습니다."));
        mvc.perform(delete(ROOT + "/300"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.message").value("구매요청이 삭제되었습니다."));
        verify(service).deleteRequest(1L, "user01", 300L);
    }

    @Test
    void rejectsMissingAuthentication() throws Exception {
        user = null;
        mvc.perform(post(ROOT).contentType(MediaType.APPLICATION_JSON).content(PAYLOAD))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    private PurchaseRequestVO stored() {
        PurchaseRequestVO request = new PurchaseRequestVO();
        request.setPurchaseRequestId(300L);
        request.setRequestNo("MR-20261112-0001");
        request.setStatus("REQUESTED");
        request.setDetails(Collections.emptyList());
        return request;
    }

    private HandlerMethodArgumentResolver loginUserResolver() {
        return new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType() == LoginVO.class;
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                    NativeWebRequest request, WebDataBinderFactory factory) {
                return user;
            }
        };
    }
}
