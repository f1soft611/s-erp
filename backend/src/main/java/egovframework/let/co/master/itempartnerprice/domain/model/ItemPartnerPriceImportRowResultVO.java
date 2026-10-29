package egovframework.let.co.master.itempartnerprice.domain.model;

import java.util.ArrayList;
import java.util.List;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "엑셀 단가 행 검증 결과")
public class ItemPartnerPriceImportRowResultVO {
    @Schema(description = "원본 worksheet 행 번호")
    private Integer sourceRowNumber;
    @Schema(description = "tenant 내 품목 ID")
    private Long materialId;
    @Schema(description = "품목코드")
    private String materialCode;
    @Schema(description = "품목명")
    private String materialName;
    @Schema(description = "tenant 내 거래처 ID")
    private Long customerId;
    @Schema(description = "거래처코드")
    private String customerCode;
    @Schema(description = "거래처명")
    private String customerName;
    @Schema(description = "행별 오류")
    private List<ItemPartnerPriceImportErrorVO> errors = new ArrayList<>();
}
