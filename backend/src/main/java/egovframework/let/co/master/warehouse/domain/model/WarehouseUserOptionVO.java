package egovframework.let.co.master.warehouse.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "창고 담당자 선택 항목")
@Getter
@Setter
public class WarehouseUserOptionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "사용자 ID")
    private Long userId;
    @Schema(description = "담당부서 ID")
    private Long departmentId;
    @Schema(description = "부서명")
    private String departmentNm;
    @Schema(description = "사용자명")
    private String userNm;
    @Schema(description = "프로필 이미지 경로")
    private String profileImage;
    @Schema(description = "직급명")
    private String levelNm;
}
