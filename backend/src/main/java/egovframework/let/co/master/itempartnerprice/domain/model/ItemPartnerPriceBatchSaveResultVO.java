package egovframework.let.co.master.itempartnerprice.domain.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "단가 배치 저장 결과")
public class ItemPartnerPriceBatchSaveResultVO {
    @Schema(description = "저장된 단가")
    private List<ItemPartnerPriceVO> prices = new ArrayList<>();
    @Schema(description = "클라이언트 로컬 ID와 서버 단가 ID 매핑")
    private Map<String, Long> rowIdMappings = new LinkedHashMap<>();

    @Schema(description = "이번 저장으로 매입 단가가 모두 사라져 기본 거래처가 자동 해제된 품목 ID")
    private List<Long> clearedDefaultMaterialIds = new ArrayList<>();
}
