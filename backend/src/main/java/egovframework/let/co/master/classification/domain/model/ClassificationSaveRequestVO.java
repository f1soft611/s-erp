package egovframework.let.co.master.classification.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ClassificationSaveRequestVO implements Serializable {
    private static final long serialVersionUID = 1L;

    private String name;
    private Integer sortSeq;
    private String useAt;
}
