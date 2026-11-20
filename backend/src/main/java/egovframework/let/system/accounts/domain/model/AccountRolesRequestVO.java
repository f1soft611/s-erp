package egovframework.let.system.accounts.domain.model;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "계정 역할 교체 요청")
@Getter
@Setter
public class AccountRolesRequestVO {

    private List<Long> roleIds;
}
