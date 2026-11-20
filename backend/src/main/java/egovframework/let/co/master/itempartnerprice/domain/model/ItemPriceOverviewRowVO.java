package egovframework.let.co.master.itempartnerprice.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목 기준 단가 트리 행. 부모는 품목+기본단가, 자식은 거래처 특별단가")
public class ItemPriceOverviewRowVO {
    @Schema(description = "행 ID. 부모 item-{materialId}, 자식 cust-{materialId}-{customerId}")
    private String rowId;
    @Schema(description = "부모 행 ID. 부모 행은 null")
    private String parentId;
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
    @Schema(description = "거래처 내부 ID. 부모 행은 null")
    private Long customerId;
    @Schema(description = "거래처코드")
    private String customerCode;
    @Schema(description = "거래처명")
    private String customerName;
    @Schema(description = "부모 행: 적용 중·예정 특별단가가 있는 거래처 수")
    private int specialCount;
    @Schema(description = "매입 단가. 없으면 null")
    private ItemPriceOverviewSideVO purchase;
    @Schema(description = "매출 단가. 없으면 null")
    private ItemPriceOverviewSideVO sales;

    @Schema(description = "부모 행: 품목의 매입 기본 거래처 ID. 없으면 null")
    private Long defaultSupplierId;

    @Schema(description = "부모 행: 매입 기본 거래처 코드")
    private String defaultSupplierCode;

    @Schema(description = "부모 행: 매입 기본 거래처명")
    private String defaultSupplierName;
}
