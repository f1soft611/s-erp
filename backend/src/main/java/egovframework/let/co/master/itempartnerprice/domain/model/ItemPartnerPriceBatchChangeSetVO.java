package egovframework.let.co.master.itempartnerprice.domain.model;

import java.util.ArrayList;
import java.util.List;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "단가 배치 변경 집합")
public class ItemPartnerPriceBatchChangeSetVO {
    @Schema(description = "신규 단가")
    private List<ItemPartnerPriceChangeVO> insertedRows = new ArrayList<>();
    @Schema(description = "수정 단가")
    private List<ItemPartnerPriceChangeVO> updatedRows = new ArrayList<>();
    @Schema(description = "삭제 요청. 삭제는 허용되지 않음")
    private List<ItemPartnerPriceChangeVO> deletedRows = new ArrayList<>();
}
