package egovframework.let.co.workflow.form.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DraftingWorkSearchConditionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long tenantId;
    private Long workId;
    private String keyword;
    private Long categoryItemId;
    private Long regTermId;
    private String useAt;
}