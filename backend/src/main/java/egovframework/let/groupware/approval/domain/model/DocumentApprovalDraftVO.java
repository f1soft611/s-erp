package egovframework.let.groupware.approval.domain.model;

public class DocumentApprovalDraftVO {

    private Long electronicApprovalId;
    private String documentStatus;

    public Long getElectronicApprovalId() { return electronicApprovalId; }
    public void setElectronicApprovalId(Long electronicApprovalId) { this.electronicApprovalId = electronicApprovalId; }
    public String getDocumentStatus() { return documentStatus; }
    public void setDocumentStatus(String documentStatus) { this.documentStatus = documentStatus; }
}
