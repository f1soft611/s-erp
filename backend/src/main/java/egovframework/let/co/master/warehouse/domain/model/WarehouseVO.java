package egovframework.let.co.master.warehouse.domain.model;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "창고 정보")
@Getter
@Setter
public class WarehouseVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "창고 ID")
    private Long warehouseId;

    @Schema(description = "테넌트 ID")
    private Long tenantId;

    @Schema(description = "창고 코드", example = "001")
    private String warehouseCode;

    @Schema(description = "창고명")
    private String warehouseName;

    @Schema(description = "창고구분(공통코드 WAREHOUSE_TYPE)")
    private String warehouseType;

    @Schema(description = "삭제불가여부", allowableValues = { "Y", "N" }, example = "N")
    private String deleteLockAt;

    @Schema(description = "불용창고여부", allowableValues = { "Y", "N" }, example = "N")
    private String disuseAt;

    @Schema(description = "현재고표시여부", allowableValues = { "Y", "N" }, example = "Y")
    private String stockQtyDispAt;

    @Schema(description = "수불처리여부", allowableValues = { "Y", "N" }, example = "Y")
    private String stockIoAt;

    @Schema(description = "안전재고미달알림여부", allowableValues = { "Y", "N" }, example = "N")
    private String safetyStockAlertAt;

    @Schema(description = "재고현황기본조회포함여부", allowableValues = { "Y", "N" }, example = "N")
    private String stockDefaultAt;

    @Schema(description = "사업장 구분(0:사내, 1:외부). 추후 사업장 테이블 참조로 교체 예정")
    private Long plantId;

    @Schema(description = "거래처 ID")
    private Long customerId;

    @Schema(description = "담당자 사용자 ID")
    private Long managerUserId;

    @Schema(description = "담당자명")
    private String managerUserName;

    @Schema(description = "담당부서 ID. 담당자 선택 시 자동 반영되며 직접 수정 불가")
    private Long departmentId;

    @Schema(description = "담당부서명")
    private String departmentName;

    @Schema(description = "전화번호")
    private String telNo;

    @Schema(description = "팩스번호")
    private String faxNo;

    @Schema(description = "주소")
    private String address;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "생성 사용자 ID")
    private Long createdBy;

    @Schema(description = "생성 일시")
    private Date createdAt;

    @Schema(description = "수정 사용자 ID")
    private Long updatedBy;

    @Schema(description = "수정 일시")
    private Date updatedAt;
}
