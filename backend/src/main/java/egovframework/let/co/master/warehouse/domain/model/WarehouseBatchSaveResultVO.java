package egovframework.let.co.master.warehouse.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "창고 일괄 저장 결과")
@Getter
@Setter
public class WarehouseBatchSaveResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "등록 또는 수정된 창고 목록. 추가 행 다음에 수정 행 순서로 반환")
    private List<WarehouseVO> warehouses = new ArrayList<>();
    @Schema(description = "요청 행 ID와 저장된 실제 ID 매핑")
    private Map<String, Long> rowIdMappings = new LinkedHashMap<>();
}
