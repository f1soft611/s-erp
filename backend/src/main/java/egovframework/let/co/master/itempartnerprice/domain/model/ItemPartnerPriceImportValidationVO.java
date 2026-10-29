package egovframework.let.co.master.itempartnerprice.domain.model;

import java.util.ArrayList;
import java.util.List;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "엑셀 단가 사전검증 응답")
public class ItemPartnerPriceImportValidationVO {
    @Schema(description = "엑셀 원본 행별 검증 결과")
    private List<ItemPartnerPriceImportRowResultVO> rows = new ArrayList<>();
}
