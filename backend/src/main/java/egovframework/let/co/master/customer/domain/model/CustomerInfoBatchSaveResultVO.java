package egovframework.let.co.master.customer.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "거래처 일괄 저장 결과")
@Getter
@Setter
public class CustomerInfoBatchSaveResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "등록 또는 수정된 거래처 목록. 추가 행 다음에 수정 행 순서로 반환")
    private List<CustomerInfoVO> customers = new ArrayList<>();
}
