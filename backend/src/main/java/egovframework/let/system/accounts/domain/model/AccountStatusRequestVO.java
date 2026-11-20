package egovframework.let.system.accounts.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "계정 허용/미허용 요청")
@Getter
@Setter
public class AccountStatusRequestVO {

    @Schema(description = "Y 허용, N 미허용")
    private String useAt;
}
