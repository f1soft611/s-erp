package egovframework.let.co.master.classification.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ClassificationVO implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String name;
    private Integer level;
    private Long parentId;
    private Integer sortSeq;
    private String useAt;
}
