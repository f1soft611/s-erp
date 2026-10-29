package egovframework.let.co.master.itempartnerprice.domain.model;

import java.util.ArrayList;
import java.util.List;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "엑셀 단가 사전검증 요청")
public class ItemPartnerPriceImportPreflightRequestVO {
    @Schema(description = "검증할 엑셀 원본 행", required = true)
    private List<ItemPartnerPriceImportRowVO> rows = new ArrayList<>();
}
