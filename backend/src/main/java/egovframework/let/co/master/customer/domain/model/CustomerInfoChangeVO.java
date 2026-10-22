package egovframework.let.co.master.customer.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "거래처 변경 행")
@Getter
@Setter
public class CustomerInfoChangeVO extends CustomerInfoSaveRequestVO {

    private static final long serialVersionUID = 1L;

    @Schema(description = "신규 행의 로컬 ID 또는 수정 행의 서버 ID. 신규 ID는 저장하지 않으며 수정 ID는 양의 정수 문자열", example = "12")
    private String customerId;
}
