package egovframework.let.co.master.material.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목 조회 응답")
public class MaterialInfoVO extends MaterialInfoSaveRequestVO {
    private static final long serialVersionUID = 1L;
    @Schema(description = "품목 ID. DB 기본 시퀀스 생성")
    private Long materialId;
    private String itemClsPath;
    @Schema(description = "인증 테넌트 ID")
    private Long tenantId;
    @Schema(description = "삭제여부. 이 화면은 N인 품목만 조회")
    private String deleteStatus;
    @Schema(description = "삭제일시")
    private String deletedAt;
    @Schema(description = "등록자 ID 문자열")
    private String createdBy;
    @Schema(description = "등록일시")
    private String createdAt;
    @Schema(description = "수정자 ID 문자열")
    private String updatedBy;
    @Schema(description = "수정일시")
    private String updatedAt;
}
