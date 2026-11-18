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
    @Schema(description = "삭제 요청(priceId만 사용). 적용 중·예정 단가만 삭제할 수 있고 직전 단가의 종료일이 다시 열린다")
    private List<ItemPartnerPriceChangeVO> deletedRows = new ArrayList<>();
}
