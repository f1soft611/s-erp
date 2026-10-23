package egovframework.let.co.master.material.domain.model;

import java.util.ArrayList;
import java.util.List;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목 배치 변경 집합")
public class MaterialInfoBatchChangeSetVO {
    @Schema(description = "신규 품목 행")
    private List<MaterialInfoChangeVO> insertedRows = new ArrayList<>();
    @Schema(description = "수정 품목 행")
    private List<MaterialInfoChangeVO> updatedRows = new ArrayList<>();
    @Schema(description = "삭제 미지원. 빈 배열만 허용")
    private List<MaterialInfoChangeVO> deletedRows = new ArrayList<>();
}
