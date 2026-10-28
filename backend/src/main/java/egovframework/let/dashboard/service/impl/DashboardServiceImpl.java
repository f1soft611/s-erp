package egovframework.let.dashboard.service.impl;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.dashboard.domain.model.DashboardOverviewVO;
import egovframework.let.dashboard.domain.model.DashboardSalesVO;
import egovframework.let.dashboard.domain.repository.DashboardDAO;
import egovframework.let.dashboard.service.DashboardService;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalSummaryVO;
import egovframework.let.groupware.approval.write.service.DocumentApprovalWriteService;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service("dashboardService")
public class DashboardServiceImpl implements DashboardService {
    private static final String WRITE = "/groupware/doc/write";
    private static final String READ = "/groupware/doc/read";
    private static final String NOTICE = "/groupware/community/notice";
    private static final String SALES = "/sales/order/status";
    private final DashboardDAO dao;
    private final SystemMenuService menuService;
    private final DocumentApprovalWriteService approvalService;
    private final Clock clock;

    @Autowired
    public DashboardServiceImpl(DashboardDAO dao, SystemMenuService menuService,
            DocumentApprovalWriteService approvalService) {
        this(dao, menuService, approvalService, Clock.systemDefaultZone());
    }

    public DashboardServiceImpl(DashboardDAO dao, SystemMenuService menuService,
            DocumentApprovalWriteService approvalService, Clock clock) {
        this.dao = dao;
        this.menuService = menuService;
        this.approvalService = approvalService;
        this.clock = clock;
    }

    @Override
    public DashboardOverviewVO overview(LoginVO user) throws Exception {
        List<MenuTreeNodeVO> menus = userMenus(user);
        DashboardOverviewVO result = new DashboardOverviewVO();
        result.setAsOfDate(LocalDate.now(clock).toString());
        result.setFetchedAt(OffsetDateTime.now(clock).toString());
        result.setCanReadApprovals(canRead(menus, WRITE) || canRead(menus, READ));
        result.setApprovalPath(canRead(menus, WRITE) ? WRITE : canRead(menus, READ) ? READ : null);
        result.setCanReadNotices(canRead(menus, NOTICE));
        result.setCanReadSales(canRead(menus, SALES));
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("drafterId", user.getId());

        if (result.isCanReadApprovals()) {
            try {
                DocumentApprovalSummaryVO summary = approvalService.getSummary(user);
                DashboardOverviewVO.Approval approval = new DashboardOverviewVO.Approval();
                approval.setActionRequiredCount(summary.getActionRequiredCount());
                approval.setDraftCount(summary.getDraftCount());
                approval.setRevisionRequestedCount(dao.selectMyRevisionCount(params));
                if (summary.getNotices() != null) {
                    for (DocumentApprovalListItemVO source : summary.getNotices()) {
                        DashboardOverviewVO.WorkItem item = new DashboardOverviewVO.WorkItem();
                        item.setElectronicApprovalId(source.getElectronicApprovalId());
                        item.setTitle(source.getTitle());
                        item.setNoticeType(source.getNoticeType());
                        approval.getNotices().add(item);
                    }
                }
                result.setApproval(approval);
                result.setApprovalStatus("ready");
            } catch (Exception exception) {
                result.setApprovalStatus("error");
                log.warn("Dashboard approval summary unavailable");
            }
        }
        if (result.isCanReadNotices()) {
            try {
                result.setNotices(dao.selectNotices(params));
                result.setNoticeStatus("ready");
            } catch (Exception exception) {
                result.setNoticeStatus("error");
                log.warn("Dashboard notice summary unavailable");
            }
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardSalesVO sales(LoginVO user, String month) throws Exception {
        List<MenuTreeNodeVO> menus = userMenus(user);
        if (!canRead(menus, SALES)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "수주현황 조회 권한이 없습니다.");
        }
        YearMonth selected = selectedMonth(month);
        LocalDate today = LocalDate.now(clock);
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("from", selected.atDay(1).toString());
        params.put("to", selected.atEndOfMonth().toString());
        params.put("trendFrom", selected.minusMonths(5).atDay(1).toString());
        params.put("dueFrom", today.toString());
        params.put("dueTo", today.plusDays(6).toString());
        DashboardSalesVO result = dao.selectSalesTotals(params);
        if (result == null) {
            throw new IllegalStateException("수주 집계를 조회하지 못했습니다.");
        }
        result.setMonth(selected.toString());
        result.setFrom(selected.atDay(1).toString());
        result.setTo(selected.atEndOfMonth().toString());
        result.setAsOfDate(today.toString());
        result.setFetchedAt(OffsetDateTime.now(clock).toString());
        Map<String, DashboardSalesVO.Trend> byMonth = new HashMap<>();
        for (DashboardSalesVO.Trend item : dao.selectSalesTrend(params)) {
            byMonth.put(item.getMonth(), item);
        }
        List<DashboardSalesVO.Trend> trend = new ArrayList<>();
        for (int offset = 5; offset >= 0; offset--) {
            String key = selected.minusMonths(offset).toString();
            DashboardSalesVO.Trend item = byMonth.get(key);
            if (item == null) {
                item = new DashboardSalesVO.Trend();
                item.setMonth(key);
            }
            trend.add(item);
        }
        result.setTrend(trend);
        result.setUpcomingCount(dao.selectUpcomingCount(params));
        result.setUpcoming(dao.selectUpcomingOrders(params));
        return result;
    }

    private List<MenuTreeNodeVO> userMenus(LoginVO user) throws Exception {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId())
                || !StringUtils.hasText(user.getUniqId()) || !StringUtils.hasText(user.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        MyMenuResponseVO response = menuService.getMyMenuTree(
                user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode());
        if (response == null || response.getMenus() == null) {
            throw new IllegalStateException("메뉴 권한을 확인하지 못했습니다.");
        }
        return response.getMenus();
    }

    private boolean canRead(List<MenuTreeNodeVO> nodes, String path) {
        for (MenuTreeNodeVO node : nodes) {
            if (node.getChildren() != null && !node.getChildren().isEmpty()) {
                if (canRead(node.getChildren(), path)) return true;
            } else if (node.getPath() != null && path.equals(node.getPath().replaceAll("/+$", ""))
                    && node.getPermissions() != null && node.getPermissions().isRead()) {
                return true;
            }
        }
        return false;
    }

    private YearMonth selectedMonth(String value) {
        if (value == null) return YearMonth.now(clock);
        try {
            if (!value.matches("\\d{4}-\\d{2}")) throw new DateTimeParseException("month", value, 0);
            YearMonth month = YearMonth.parse(value);
            if (month.getYear() < 1900 || month.getYear() > 9998) {
                throw new DateTimeParseException("year", value, 0);
            }
            return month;
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "조회 월은 1900~9998년의 YYYY-MM 형식이어야 합니다.");
        }
    }
}
