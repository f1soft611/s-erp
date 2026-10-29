package egovframework.let.dashboard;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    void serializesReferenceConfirmationSummarySeparatelyFromApprovalNotices() throws Exception {
        String overviewJson = "{\"asOfDate\":\"2026-10-28\",\"approvalStatus\":\"ready\","
                + "\"approval\":{\"actionRequiredCount\":3,"
                + "\"notices\":[{\"electronicApprovalId\":301,\"title\":\"결재 확인\"}],"
                + "\"referenceConfirmationRequiredCount\":2,"
                + "\"referenceConfirmationItems\":["
                + "{\"electronicApprovalId\":401,\"title\":\"참조 문서 1\"},"
                + "{\"electronicApprovalId\":402,\"title\":\"참조 문서 2\"}]}}";
        DashboardOverviewVO result = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .readValue(overviewJson, DashboardOverviewVO.class);
        when(service.overview(user)).thenReturn(result);

        mvc.perform(get("/api/v1/dashboard/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.approval.referenceConfirmationRequiredCount").value(2))
                .andExpect(jsonPath("$.result.item.approval.referenceConfirmationItems.length()").value(2))
                .andExpect(jsonPath("$.result.item.approval.referenceConfirmationItems[0].electronicApprovalId")
                        .value(401))
                .andExpect(jsonPath("$.result.item.approval.referenceConfirmationItems[0].title")
                        .value("참조 문서 1"))
                .andExpect(jsonPath("$.result.item.approval.referenceConfirmationItems[0].noticeType")
                        .doesNotHaveJsonPath())
                .andExpect(jsonPath("$.result.item.approval.notices.length()").value(1))
                .andExpect(jsonPath("$.result.item.approval.notices[0].electronicApprovalId").value(301));
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
