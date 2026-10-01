package egovframework.let.co.workflow.form.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DraftingWorkUserOptionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long userId;
    private Long loginId;
    private String userNm;
    private String departmentNm;
    private String profileImage;
    private String levelNm;
}