package egovframework.let.hr.employee.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "사원 일괄 저장 결과")
@Getter
@Setter
public class EmployeeBatchSaveResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "등록 또는 수정된 사원 목록. 추가 행 다음에 수정 행 순서로 반환")
    private List<EmployeeVO> employees = new ArrayList<EmployeeVO>();

    @Schema(description = "요청 행 ID와 저장된 실제 사원 ID 매핑")
    private Map<String, Long> rowIdMappings = new LinkedHashMap<String, Long>();
}
