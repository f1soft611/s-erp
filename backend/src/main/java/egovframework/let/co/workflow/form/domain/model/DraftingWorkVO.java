package egovframework.let.co.workflow.form.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DraftingWorkVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long draftingWorkCategoryId;
    private Long tenantId;
    private String cataTypeCode;
    private String codeName;
    private Long categoryItemId;
    private String categoryName;
    private Long regTermId;
    private String regTerm;
    private String useAt;
    private Long reviewerId;
    private String reviewerName;
    private Long approverId;
    private String approverName;
    private String assigneeSummary;
    private List<String> assigneeIds = new ArrayList<String>();
    private String createdByName;
    private String createdAt;
    private Boolean hasDocument;
}