package egovframework.let.co.master.itempartnerprice.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품목 기준 단가 화면의 왼쪽 품목 목록 한 행. 단가는 선택 품목의 단가 목록 API로 따로 읽는다.
 */
@Getter
@Setter
@Schema(description = "품목 기준 단가 화면의 품목 행(품목 1건)")
public class ItemPriceOverviewRowVO {
    @Schema(description = "품목 내부 ID")
    private Long materialId;
    @Schema(description = "품목코드")
    private String materialCode;
    @Schema(description = "품목명")
    private String materialName;
    @Schema(description = "규격")
    private String materialSpec;
    @Schema(description = "품목 마스터 단위")
    private String materialUnit;
    @Schema(description = "품목 계정분류 코드(PRODUCT, SEMI, GOODS, RAW, SUB, SUPPLY)")
    private String materialTypeCode;
    @Schema(description = "선택한 거래구분에서 사용 중 단가가 있는 거래처 수")
    private int customerCount;
    @Schema(description = "매입 기본 거래처 ID. 매입이 아니거나 없으면 null")
    private Long defaultSupplierId;
    @Schema(description = "매입 기본 거래처 코드")
    private String defaultSupplierCode;
    @Schema(description = "매입 기본 거래처명")
    private String defaultSupplierName;
    // 기본 거래처 서비스가 기본 거래처 행을 읽을 때 쓰는 거래처 값(화면 계약에는 쓰이지 않는다)
    private Long customerId;
    private String customerCode;
    private String customerName;
}
