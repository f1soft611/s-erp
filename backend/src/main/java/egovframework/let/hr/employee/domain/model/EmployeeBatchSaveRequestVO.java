package egovframework.let.hr.employee.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "사원 일괄 저장 요청")
@Getter
@Setter
public class EmployeeBatchSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private EmployeeBatchChangeSetVO employees;
}
