package egovframework.let.hr.employee.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 사원 선택 도움창 행. 선택에 필요한 항목만 담고 연락처·주민번호·주소·이메일·로그인 정보는 포함하지 않는다.
 * 일반 사용자도 조회하는 API라서 항목을 늘릴 때는 개인정보가 아닌지 먼저 확인한다.
 */
@Schema(description = "사원 선택 도움창 행")
@Getter
@Setter
public class EmployeePickerVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long userId;
    private String employeeNo;
    private String userNm;
    /** 부서가 지정되지 않은 사원은 null. */
    private Long departmentId;
    private String departmentNm;
    private String positionCode;
    private String positionNm;
    /** 사원 사진(데이터 URL, 없으면 null). */
    private String photoImage;
}
