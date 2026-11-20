package egovframework.let.hr.department.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "부서 소속 사원")
@Getter
@Setter
public class DepartmentUserVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "사용자 ID")
    private Long userId;
    @Schema(description = "사용자명")
    private String userNm;
    @Schema(description = "직급명")
    private String levelNm;
    @Schema(description = "로그인 아이디")
    private String loginCode;
    @Schema(description = "휴대전화")
    private String mobileNo;
    @Schema(description = "이메일")
    private String emailAddr;
    @Schema(description = "부서장 여부(Y/N)")
    private String managerYn;
    @Schema(description = "사번")
    private String employeeNo;
    @Schema(description = "직위명")
    private String positionNm;
    @Schema(description = "재직상태 ACTIVE(재직)/LEAVE(휴직)/RETIRED(퇴직)")
    private String employmentStatus;
}
