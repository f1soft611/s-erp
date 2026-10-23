package egovframework.let.co.master.material.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목 배치 변경 행. 업무 필드는 저장 요청에서 상속")
public class MaterialInfoChangeVO extends MaterialInfoSaveRequestVO {
    private static final long serialVersionUID = 1L;
    @Schema(description = "신규 행은 로컬 ID, 수정 행은 양의 서버 품목 ID 문자열")
    private String materialId;
}
