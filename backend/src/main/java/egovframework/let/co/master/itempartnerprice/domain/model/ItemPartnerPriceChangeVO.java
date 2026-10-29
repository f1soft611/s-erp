package egovframework.let.co.master.itempartnerprice.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "단가 배치 변경 행")
public class ItemPartnerPriceChangeVO extends ItemPartnerPriceSaveRequestVO {
    private static final long serialVersionUID = 1L;
    @Schema(description = "신규는 로컬 행 ID, 수정은 양의 서버 단가 ID 문자열")
    private String priceId;
}
