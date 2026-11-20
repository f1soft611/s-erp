package egovframework.let.hr.order.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "인사명령 처리 요청. 대상 사원마다 명령 후 값을 보낸다")
@Getter
@Setter
public class HrOrderProcessRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "명령 유형(HrOrderType 중 선택 가능한 것)", example = "TRANSFER")
    private String orderType;

    @Schema(description = "명령일(yyyy-MM-dd). 오늘 이하", example = "2026-11-20")
    private String orderDt;

    @Schema(description = "비고(선택, 500자)")
    private String remark;

    @Schema(description = "대상 사원과 명령 후 값")
    private List<Item> items = new ArrayList<>();

    @Schema(description = "대상 사원 1명")
    @Getter
    @Setter
    public static class Item implements Serializable {

        private static final long serialVersionUID = 1L;

        private Long userId;

        @Schema(description = "명령 후 값: 부서 ID, 공통코드(직위·근무형태)·직급 ID, 날짜(yyyy-MM-dd). 날짜 유형은 비우면 명령일")
        private String postValue;
    }
}
