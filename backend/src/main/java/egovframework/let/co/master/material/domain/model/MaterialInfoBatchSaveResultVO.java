package egovframework.let.co.master.material.domain.model;

import java.util.ArrayList;
import java.util.List;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목 일괄 저장 응답")
public class MaterialInfoBatchSaveResultVO {
    @Schema(description = "저장한 품목 목록")
    private List<MaterialInfoVO> materials = new ArrayList<>();
}
