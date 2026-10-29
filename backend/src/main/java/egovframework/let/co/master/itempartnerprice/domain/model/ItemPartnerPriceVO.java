package egovframework.let.co.master.itempartnerprice.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목·거래처별 단가 조회 응답")
public class ItemPartnerPriceVO extends ItemPartnerPriceSaveRequestVO {
    private static final long serialVersionUID = 1L;
    @Schema(description = "단가 내부 ID")
    private Long priceId;
    @Schema(description = "소속 tenant ID")
    private Long tenantId;
    @Schema(description = "품목코드")
    private String materialCode;
    @Schema(description = "품목명")
    private String materialName;
    @Schema(description = "거래처코드")
    private String customerCode;
    @Schema(description = "거래처명")
    private String customerName;
    @Schema(description = "등록자 ID")
    private String createdBy;
    @Schema(description = "등록일시")
    private String createdAt;
    @Schema(description = "수정자 ID")
    private String updatedBy;
    @Schema(description = "수정일시")
    private String updatedAt;
}
