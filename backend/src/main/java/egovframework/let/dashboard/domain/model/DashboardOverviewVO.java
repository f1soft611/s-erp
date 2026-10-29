package egovframework.let.dashboard.domain.model;

import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DashboardOverviewVO {
    private String asOfDate;
    private String fetchedAt;
    private boolean canReadApprovals;
    private boolean canReadNotices;
    private boolean canReadSales;
    private String approvalPath;
    private String approvalStatus = "forbidden";
    private String noticeStatus = "forbidden";
    private Approval approval;
    private List<Notice> notices = new ArrayList<>();

    @Getter
    @Setter
    public static class Approval {
        private Long actionRequiredCount;
        private Long draftCount;
        private Long revisionRequestedCount;
        private List<WorkItem> notices = new ArrayList<>();
        private Long referenceConfirmationRequiredCount;
        private List<ReferenceConfirmationItem> referenceConfirmationItems = new ArrayList<>();
    }

    @Getter
    @Setter
    public static class WorkItem {
        private Long electronicApprovalId;
        private String title;
        private String noticeType;
    }

    @Getter
    @Setter
    public static class ReferenceConfirmationItem {
        private Long electronicApprovalId;
        private String title;
    }

    @Getter
    @Setter
    public static class Notice {
        private Long postId;
        private String title;
        private String isPinned;
        private String createdAt;
    }
}
