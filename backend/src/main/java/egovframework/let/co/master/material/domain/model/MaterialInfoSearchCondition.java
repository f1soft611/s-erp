package egovframework.let.co.master.material.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목 검색 조건. 테넌트는 인증 정보에서 결정")
public class MaterialInfoSearchCondition {
    @Schema(description = "코드/명/영문명/모델명/통합검색명칭 부분검색")
    private String keyword;
    @Schema(description = "품목규격 부분검색")
    private String materialSpec;
    @Schema(description = "품목계정코드 부분검색")
    private String materialTypeCode;
    @Schema(description = "품목분류 부분검색")
    private String matCataType;
    @Schema(description = "제조사 코드 부분검색")
    private String customerCode;
    @Schema(description = "창고코드 부분검색")
    private String warehouseCode;
    @Schema(description = "품목바코드 부분검색")
    private String itemBarcode;
    @Schema(description = "품목유형 정확검색")
    private String materialKind;
    @Schema(description = "보관방법 정확검색")
    private String storeMethod;
    @Schema(description = "소비기한기준 정확검색", allowableValues = {"NONE", "DAY", "MONTH", "YEAR"})
    private String expiryedStatus;
}
