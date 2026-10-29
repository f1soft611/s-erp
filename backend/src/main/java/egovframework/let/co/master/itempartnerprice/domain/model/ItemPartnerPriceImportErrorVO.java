package egovframework.let.co.master.itempartnerprice.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Schema(description = "엑셀 단가 행 검증 오류")
public class ItemPartnerPriceImportErrorVO {
    @Schema(description = "오류 코드")
    private final String code;
    @Schema(description = "표시할 검증 오류")
    private final String message;
}
