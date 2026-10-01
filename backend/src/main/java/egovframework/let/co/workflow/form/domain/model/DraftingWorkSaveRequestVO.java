package egovframework.let.co.workflow.form.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DraftingWorkSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String cataTypeCode;
    private String codeName;
    private Long categoryItemId;
    private Long regTermId;
    private Long reviewerId;
    private Long approverId;
    private List<String> assigneeIds = new ArrayList<String>();
    private String useAt;
}