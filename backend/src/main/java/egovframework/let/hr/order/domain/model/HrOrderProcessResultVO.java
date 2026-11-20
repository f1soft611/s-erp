package egovframework.let.hr.order.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "인사명령 처리 결과")
@Getter
@Setter
public class HrOrderProcessResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long orderId;
    @Schema(description = "처리한 사원 수")
    private int count;
    private List<Item> items = new ArrayList<>();

    @Getter
    @Setter
    public static class Item implements Serializable {

        private static final long serialVersionUID = 1L;

        private Long userId;
        private String userNm;
        private String fieldCode;
        private String preName;
        private String postName;
    }
}
