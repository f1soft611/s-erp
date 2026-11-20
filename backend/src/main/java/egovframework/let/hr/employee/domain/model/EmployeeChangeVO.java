package egovframework.let.hr.employee.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/** 일괄 저장의 변경 행: 사원 저장 요청에 화면이 붙인 요청 행 ID를 더한 것이다. */
@Schema(description = "사원 일괄 저장 변경 행")
@Getter
@Setter
public class EmployeeChangeVO extends EmployeeSaveRequestVO {

    private static final long serialVersionUID = 1L;

    @Schema(description = "요청 행 ID. 등록 행은 화면이 만든 임시 ID, 수정 행은 사원 ID(양의 정수 문자열)")
    private String userId;
}
