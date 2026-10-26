package egovframework.let.co.master.material.domain.model;

import java.io.Serializable;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목 저장 요청. 테넌트, 감사 및 삭제 상태는 서버에서 결정")
public class MaterialInfoSaveRequestVO implements Serializable {
    private static final long serialVersionUID = 1L;
    @Schema(description = "품목코드. 서버에서 신규 저장 시 eGov IDS 6자리로 자동 채번하며 요청값은 무시되고, 수정 시 기존 코드가 유지됩니다.")
    private String materialCode;
    @Schema(description = "품목명", required = true)
    private String materialName;
    @Schema(description = "품목영문명")
    private String materialEngName;
    @Schema(description = "품목모델명")
    private String materialModelName;
    @Schema(description = "품목규격")
    private String materialSpec;
    @Schema(description = "중량. 선택 정수")
    @JsonDeserialize(using = MaterialIntegerJsonDeserializers.LongValue.class)
    private Long materialWeight;
    @Schema(description = "단위")
    private String unit;
    @Schema(description = "품목계정코드", required = true)
    private String materialTypeCode;
    @Schema(description = "제조사 코드")
    private String customerCode;
    @Schema(description = "안전재고. 선택 유한 실수")
    private Double safeInvoice;
    @Schema(description = "회계코드")
    private String accountingCode;
    @Schema(description = "창고코드")
    private String warehouseCode;
    @Schema(description = "도면번호")
    private String drawing;
    @Schema(description = "비고")
    private String etc;
    @Schema(description = "Part No")
    private String partNo;
    @Schema(description = "제조")
    private String manufactory;
    @Schema(description = "품목분류. 빈 문자열 허용")
    private String matCataType;
    @Schema(description = "위치정보")
    private String location;
    @Schema(description = "품목규격2")
    private String materialSpec2;
    @Schema(description = "품목계정")
    private String itemType;
    @Schema(description = "통합검색명칭")
    private String searchItemName;
    @Schema(description = "품목재질")
    private String materialQuality;
    @Schema(description = "품목바코드")
    private String itemBarcode;
    @Schema(description = "품목번호")
    private String materialNo;
    @Schema(description = "품목유형. MATERIAL_TYPE 공통코드")
    private String materialKind;
    @Schema(description = "보관방법. STORE_METHOD 공통코드")
    private String storeMethod;
    @Schema(description = "소비기한기준. 미입력 기본 NONE", allowableValues = {"NONE", "DAY", "MONTH", "YEAR"})
    private String expiryedStatus;
    @Schema(description = "소비기한계산숫자. 선택 또는 양의 정수")
    @JsonDeserialize(using = MaterialIntegerJsonDeserializers.IntegerValue.class)
    private Integer expiryedCount;
    @Schema(description = "품목보고번호")
    private String kfdaReportNo;
}
