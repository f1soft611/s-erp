package egovframework.let.hr.department.domain.model;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "부서")
@Getter
@Setter
public class DepartmentVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "부서 ID")
    private Long departmentId;
    @Schema(description = "테넌트 ID")
    private Long tenantId;
    @Schema(description = "상위 부서 ID(최상위는 null)")
    private Long parentDepartmentId;
    @Schema(description = "부서명")
    private String departmentNm;
    @Schema(description = "부서장 사용자 ID")
    private Long managerUserId;
    @Schema(description = "부서장 이름")
    private String managerUserNm;
    @Schema(description = "부서 설명")
    private String departmentDc;
    @Schema(description = "정렬 순서")
    private Integer sortOrder;
    @Schema(description = "사용 여부(Y/N)")
    private String useAt;
    @Schema(description = "사용 중인 하위 부서 수")
    private Integer childCount;
    @Schema(description = "사용 중인 소속 사원 수")
    private Integer userCount;
    @Schema(description = "등록자 ID")
    private Long createdBy;
    @Schema(description = "등록 일시")
    private Date createdAt;
    @Schema(description = "수정자 ID")
    private Long updatedBy;
    @Schema(description = "수정 일시")
    private Date updatedAt;
}
