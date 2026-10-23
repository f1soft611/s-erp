package egovframework.let.co.master.material.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목 일괄 저장 요청")
public class MaterialInfoBatchSaveRequestVO {
    @Schema(description = "단일 트랜잭션으로 저장할 품목 변경 집합", required = true)
    private MaterialInfoBatchChangeSetVO materials;
}
