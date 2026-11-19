package egovframework.let.hr.department.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "부서 사용안함·복원 요청")
@Getter
@Setter
public class DepartmentUseRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "사용 여부(Y 복원, N 사용안함)")
    private String useAt;
}
