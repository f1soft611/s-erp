package egovframework.let.co.master.material.domain.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목 일괄 저장 응답")
public class MaterialInfoBatchSaveResultVO {
    @Schema(description = "저장한 품목 목록")
    private List<MaterialInfoVO> materials = new ArrayList<>();
    @Schema(description = "요청 행 ID와 저장된 실제 ID 매핑")
    private Map<String, Long> rowIdMappings = new LinkedHashMap<>();
}
