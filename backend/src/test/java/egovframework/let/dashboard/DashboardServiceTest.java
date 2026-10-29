package egovframework.let.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.dashboard.domain.model.DashboardOverviewVO;
import egovframework.let.dashboard.domain.model.DashboardSalesVO;
import egovframework.let.dashboard.domain.repository.DashboardDAO;
import egovframework.let.dashboard.service.impl.DashboardServiceImpl;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalSummaryVO;
import egovframework.let.groupware.approval.write.service.DocumentApprovalWriteService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

class DashboardServiceTest {
    private final DashboardDAO dao = mock(DashboardDAO.class);
    private final SystemMenuService menus = mock(SystemMenuService.class);
    private final DocumentApprovalWriteService approvals = mock(DocumentApprovalWriteService.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-28T00:10:00Z"), ZoneId.of("Asia/Seoul"));
    private DashboardServiceImpl service;
    private LoginVO user;

    @BeforeEach
    void setUp() throws Exception {
        service = new DashboardServiceImpl(dao, menus, approvals, clock);
        user = new LoginVO();
        user.setTenantId(71L);
        user.setId("fixture");
        user.setUniqId("9");
        user.setName("테스트");
        grant();
    }

    @Test
    void missingAuthenticationNeverQueriesAnySource() {
        assertThatThrownBy(() -> service.overview(null))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("401");
        user.setUniqId(null);
        assertThatThrownBy(() -> service.sales(user, null)).hasMessageContaining("401");
        verifyNoInteractions(dao, menus, approvals);
    }

    @Test
    void ungrantedReadHidesWidgetsAndBlocksSalesEvenWithOtherPermissions() throws Exception {
        MenuTreeNodeVO createOnly = new MenuTreeNodeVO();
        createOnly.setPath("/sales/order/status");
        createOnly.setPermissions(new MenuPermissionVO(false, true, true, true));
        MyMenuResponseVO createOnlyMenus = new MyMenuResponseVO();
        createOnlyMenus.setMenus(Collections.singletonList(createOnly));
        when(menus.getMyMenuTree(user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode()))
                .thenReturn(createOnlyMenus);
        DashboardOverviewVO overview = service.overview(user);
        assertThat(overview.isCanReadSales()).isFalse();
        assertThat(overview.getApprovalStatus()).isEqualTo("forbidden");
        assertThat(overview.getNoticeStatus()).isEqualTo("forbidden");
        assertThat(overview.getApproval()).isNull();
        assertThatThrownBy(() -> service.sales(user, "2026-10")).hasMessageContaining("403");
        verifyNoInteractions(dao, approvals);
    }

    @Test
    void personalRevisionsAreOwnedAndNoticeFailureDoesNotRemoveApproval() throws Exception {
        grant("/groupware/doc/read", "/groupware/community/notice");
        DocumentApprovalSummaryVO summary = new DocumentApprovalSummaryVO();
        summary.setActionRequiredCount(3L);
        summary.setRevisionRequestedCount(99L);
        summary.setReferenceConfirmationRequiredCount(0L);
        summary.setReferenceConfirmationItems(Collections.emptyList());
        when(approvals.getSummary(user)).thenReturn(summary);
        when(dao.selectMyRevisionCount(any())).thenReturn(2L);
        when(dao.selectNotices(any())).thenThrow(new IllegalStateException("internal source failure"));

        DashboardOverviewVO result = service.overview(user);
        assertThat(result.getApprovalStatus()).isEqualTo("ready");
        assertThat(result.getApproval().getActionRequiredCount()).isEqualTo(3);
        assertThat(result.getApproval().getRevisionRequestedCount()).isEqualTo(2);
        assertThat(result.getNoticeStatus()).isEqualTo("error");
        assertThat(result.getNotices()).isEmpty();
        assertThat(result.getApprovalPath()).isEqualTo("/groupware/doc/read");
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(dao).selectMyRevisionCount(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", 71L).containsEntry("drafterId", "fixture");
    }

    @Test
    void mapsReferenceConfirmationCountAndItemsSeparatelyFromApprovalNotices() throws Exception {
        grant("/groupware/doc/read");
        DocumentApprovalSummaryVO summary = new DocumentApprovalSummaryVO();
        summary.setActionRequiredCount(3L);
        summary.setNotices(Collections.singletonList(approvalItem(301L, "결재 확인", "APPROVAL")));
        summary.setReferenceConfirmationRequiredCount(2L);
        summary.setReferenceConfirmationItems(Arrays.asList(
                approvalItem(401L, "참조 문서 1", null),
                approvalItem(402L, "참조 문서 2", null)));
        when(approvals.getSummary(user)).thenReturn(summary);
        when(dao.selectMyRevisionCount(any())).thenReturn(0L);

        DashboardOverviewVO result = service.overview(user);
        JsonNode approval = new ObjectMapper().valueToTree(result.getApproval());

        assertThat(result.isCanReadApprovals()).isTrue();
        assertThat(result.getApprovalPath()).isEqualTo("/groupware/doc/read");
        assertThat(approval.path("actionRequiredCount").asLong()).isEqualTo(3L);
        assertThat(approval.path("referenceConfirmationRequiredCount").asLong()).isEqualTo(2L);
        assertThat(approval.path("referenceConfirmationItems")).hasSize(2);
        assertThat(approval.path("referenceConfirmationItems").get(0).path("electronicApprovalId").asLong())
                .isEqualTo(401L);
        assertThat(approval.path("referenceConfirmationItems").get(0).path("title").asText())
                .isEqualTo("참조 문서 1");
        assertThat(approval.path("referenceConfirmationItems").get(1).path("electronicApprovalId").asLong())
                .isEqualTo(402L);
        assertThat(approval.path("referenceConfirmationItems").get(1).path("title").asText())
                .isEqualTo("참조 문서 2");
        assertThat(approval.path("notices")).hasSize(1);
        assertThat(approval.path("notices").get(0).path("electronicApprovalId").asLong()).isEqualTo(301L);
        assertThat(approval.path("notices").get(0).path("title").asText()).isEqualTo("결재 확인");
    }

    @Test
    void malformedReferenceConfirmationSummaryMarksApprovalAsUnavailable() throws Exception {
        grant("/groupware/doc/read");
        DocumentApprovalSummaryVO summary = new DocumentApprovalSummaryVO();
        summary.setActionRequiredCount(3L);
        summary.setReferenceConfirmationRequiredCount(0L);
        when(approvals.getSummary(user)).thenReturn(summary);

        DashboardOverviewVO result = service.overview(user);

        assertThat(result.getApprovalStatus()).isEqualTo("error");
        assertThat(result.getApproval()).isNull();
    }

    @Test
    void approvalFailureDoesNotRemoveNotices() throws Exception {
        grant("/groupware/doc/write", "/groupware/community/notice");
        when(approvals.getSummary(user)).thenThrow(new IllegalStateException("unavailable"));
        when(dao.selectNotices(any())).thenReturn(Collections.emptyList());
        DashboardOverviewVO result = service.overview(user);
        assertThat(result.getApprovalStatus()).isEqualTo("error");
        assertThat(result.getApproval()).isNull();
        assertThat(result.getNoticeStatus()).isEqualTo("ready");
    }

    @Test
    void usesServerMonthAndTenantAndFillsSixMonthsAcrossYearBoundary() throws Exception {
        grant("/sales/order/status");
        when(dao.selectSalesTotals(any())).thenReturn(new DashboardSalesVO());
        when(dao.selectSalesTrend(any())).thenReturn(Collections.emptyList());
        when(dao.selectUpcomingOrders(any())).thenReturn(Collections.emptyList());
        when(dao.selectUpcomingCount(any())).thenReturn(0L);

        DashboardSalesVO result = service.sales(user, "2026-02");
        assertThat(result.getFrom()).isEqualTo("2026-02-01");
        assertThat(result.getTo()).isEqualTo("2026-02-28");
        assertThat(result.getAsOfDate()).isEqualTo("2026-10-28");
        assertThat(result.getTrend()).extracting(DashboardSalesVO.Trend::getMonth)
                .containsExactly("2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02");
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(dao).selectSalesTotals(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", 71L)
                .containsEntry("dueFrom", "2026-10-28").containsEntry("dueTo", "2026-11-03");
        assertThat(service.sales(user, null).getMonth()).isEqualTo("2026-10");
    }

    @Test
    void rejectsMalformedMonthBeforeQueryingSales() throws Exception {
        grant("/sales/order/status");
        for (String invalid : Arrays.asList("2026-13", "2026-2", "0000-01", "9999-12", "not-a-month")) {
            assertThatThrownBy(() -> service.sales(user, invalid)).hasMessageContaining("400");
        }
        verifyNoInteractions(dao);
    }

    private void grant(String... paths) throws Exception {
        MyMenuResponseVO response = new MyMenuResponseVO();
        MenuTreeNodeVO root = new MenuTreeNodeVO();
        for (String path : paths) {
            MenuTreeNodeVO leaf = new MenuTreeNodeVO();
            leaf.setPath(path);
            leaf.setPermissions(new MenuPermissionVO(true, false, false, false));
            root.getChildren().add(leaf);
        }
        response.setMenus(Collections.singletonList(root));
        when(menus.getMyMenuTree(user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode()))
                .thenReturn(response);
    }

    private DocumentApprovalListItemVO approvalItem(Long id, String title, String noticeType) {
        DocumentApprovalListItemVO item = new DocumentApprovalListItemVO();
        item.setElectronicApprovalId(id);
        item.setTitle(title);
        item.setNoticeType(noticeType);
        return item;
    }
}
