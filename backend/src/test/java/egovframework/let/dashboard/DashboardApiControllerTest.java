package egovframework.let.dashboard;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.dashboard.controller.DashboardApiController;
import egovframework.let.dashboard.domain.model.DashboardOverviewVO;
import egovframework.let.dashboard.domain.model.DashboardSalesVO;
import egovframework.let.dashboard.service.DashboardService;

class DashboardApiControllerTest {
    private final DashboardService service = mock(DashboardService.class);
    private final LoginVO user = new LoginVO();
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new DashboardApiController(service, new ResultVoHelper()))
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.getParameterType() == LoginVO.class;
                    }
                    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                            NativeWebRequest request, WebDataBinderFactory factory) {
                        return user;
                    }
                }).build();
    }

    @Test
    void wrapsOverviewInExistingResultEnvelope() throws Exception {
        DashboardOverviewVO result = new DashboardOverviewVO();
        result.setAsOfDate("2026-10-28");
        when(service.overview(user)).thenReturn(result);
        mvc.perform(get("/api/v1/dashboard/overview").param("tenantId", "999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.asOfDate").value("2026-10-28"))
                .andExpect(jsonPath("$.result.item.approvalStatus").value("forbidden"));
        verify(service).overview(user);
    }

    @Test
    void bindsOnlyMonthAndAuthenticatedPrincipalForSales() throws Exception {
        DashboardSalesVO result = new DashboardSalesVO();
        result.setMonth("2026-10");
        when(service.sales(eq(user), any())).thenReturn(result);
        mvc.perform(get("/api/v1/dashboard/sales").param("month", "2026-10").param("tenantId", "999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.month").value("2026-10"))
                .andExpect(jsonPath("$.result.item.orderCount").value(0));
        verify(service).sales(user, "2026-10");
    }
}
