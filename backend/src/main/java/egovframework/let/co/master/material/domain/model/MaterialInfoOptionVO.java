package egovframework.let.co.master.material.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목 공통코드 옵션")
public class MaterialInfoOptionVO {
    @Schema(description = "공통코드 그룹 코드")
    private String groupCode;
    @Schema(description = "공통코드 항목 코드")
    private String itemCode;
    @Schema(description = "공통코드 항목명")
    private String itemName;
}
