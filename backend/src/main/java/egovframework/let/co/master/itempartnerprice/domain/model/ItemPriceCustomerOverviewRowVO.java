package egovframework.let.co.master.itempartnerprice.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "거래처 기준 단가의 거래처 행. 등록 건수는 기준일에 적용 중·예정인 (품목, 거래구분) 수")
public class ItemPriceCustomerOverviewRowVO {
    @Schema(description = "거래처 내부 ID")
    private Long customerId;
    @Schema(description = "거래처코드")
    private String customerCode;
    @Schema(description = "거래처명")
    private String customerName;
    @Schema(description = "사업자번호")
    private String businessNo;
    @Schema(description = "등록 건수(적용 중·예정 단가의 품목+구분 수)")
    private int priceCount;
}
