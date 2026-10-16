package egovframework.let.groupware.approval.domain.model;

public class DocumentApprovalStatusListItemVO extends DocumentApprovalListItemVO {

    private String drafterDepartmentName;
    private String participantName;
    private String approvalProgress;

    public String getDrafterDepartmentName() { return drafterDepartmentName; }
    public void setDrafterDepartmentName(String drafterDepartmentName) {
        this.drafterDepartmentName = drafterDepartmentName;
    }
    public String getParticipantName() { return participantName; }
    public void setParticipantName(String participantName) { this.participantName = participantName; }
    public String getApprovalProgress() { return approvalProgress; }
    public void setApprovalProgress(String approvalProgress) { this.approvalProgress = approvalProgress; }
}
