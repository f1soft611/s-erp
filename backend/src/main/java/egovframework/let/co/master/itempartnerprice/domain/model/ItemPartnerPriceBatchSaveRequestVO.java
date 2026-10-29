package egovframework.let.co.master.itempartnerprice.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "단가 배치 저장 요청")
public class ItemPartnerPriceBatchSaveRequestVO {
    @Schema(description = "신규/수정 단가 변경 집합")
    private ItemPartnerPriceBatchChangeSetVO prices;
}
