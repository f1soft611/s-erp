package egovframework.let.hr.department.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "부서 등록·수정 요청")
@Getter
@Setter
public class DepartmentSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "상위 부서 ID(최상위는 null)")
    private Long parentDepartmentId;
    @Schema(description = "부서명(필수, 100자 이하)")
    private String departmentNm;
    @Schema(description = "부서장 사용자 ID")
    private Long managerUserId;
    @Schema(description = "부서 설명(500자 이하)")
    private String departmentDc;
    @Schema(description = "정렬 순서(기본 0)")
    private Integer sortOrder;
}
