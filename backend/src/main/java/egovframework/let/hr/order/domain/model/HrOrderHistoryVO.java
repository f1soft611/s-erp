package egovframework.let.hr.order.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "인사명령 처리 내역 1행(사원별 변경항목)")
@Getter
@Setter
public class HrOrderHistoryVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long orderId;
    private Long orderDtId;
    @Schema(description = "처리일시(yyyy-MM-dd HH:mm)")
    private String createdAt;
    @Schema(description = "명령일(yyyy-MM-dd)")
    private String orderDt;
    private String orderType;
    private String orderTypeName;
    @Schema(description = "출처: ORDER·DIRECT·JOIN")
    private String source;
    private Long userId;
    private String userNm;
    private String employeeNo;
    private String fieldCode;
    private String fieldName;
    private String preName;
    private String postName;
    private String remark;
    private String createdByName;
}
