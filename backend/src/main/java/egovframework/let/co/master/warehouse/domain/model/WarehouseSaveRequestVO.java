package egovframework.let.co.master.warehouse.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "창고 저장 요청")
@Getter
@Setter
public class WarehouseSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "창고 코드. 비우면 eGov IDS 3자리로 자동 채번(001, 002, ...). 입력하면 그 값 사용(테넌트 내 중복 불가). 수정 시 비우면 기존 코드 유지", example = "001")
    private String warehouseCode;

    @Schema(description = "창고명", required = true)
    private String warehouseName;

    @Schema(description = "창고구분(공통코드 WAREHOUSE_TYPE)")
    private String warehouseType;

    @Schema(description = "삭제불가여부. 미입력 시 N", allowableValues = { "Y", "N" })
    private String deleteLockAt;

    @Schema(description = "불용창고여부. 미입력 시 N", allowableValues = { "Y", "N" })
    private String disuseAt;

    @Schema(description = "현재고표시여부. 미입력 시 Y", allowableValues = { "Y", "N" })
    private String stockQtyDispAt;

    @Schema(description = "수불처리여부. 미입력 시 Y", allowableValues = { "Y", "N" })
    private String stockIoAt;

    @Schema(description = "안전재고미달알림여부. 미입력 시 N", allowableValues = { "Y", "N" })
    private String safetyStockAlertAt;

    @Schema(description = "재고현황기본조회포함여부. 미입력 시 N", allowableValues = { "Y", "N" })
    private String stockDefaultAt;

    @Schema(description = "사업장 구분(0:사내, 1:외부)")
    private Long plantId;

    @Schema(description = "거래처 ID")
    private Long customerId;

    @Schema(description = "담당자 사용자 ID")
    private Long managerUserId;

    @Schema(description = "담당부서 ID. 담당자 선택 시 화면에서 자동 반영된 값을 그대로 전달")
    private Long departmentId;

    @Schema(description = "전화번호")
    private String telNo;

    @Schema(description = "팩스번호")
    private String faxNo;

    @Schema(description = "주소")
    private String address;

    @Schema(description = "비고")
    private String remark;
}
