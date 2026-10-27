package egovframework.let.co.master.classification.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ClassificationCreateRequestVO extends ClassificationSaveRequestVO {
    private static final long serialVersionUID = 1L;

    private Long parentId;
}
