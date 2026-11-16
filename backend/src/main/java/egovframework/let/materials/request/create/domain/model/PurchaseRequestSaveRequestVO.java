package egovframework.let.materials.request.create.domain.model;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청 등록/수정 요청을 전달하는 VO 클래스.
 * 요청자와 요청부서는 로그인 사용자 기준으로 서버에서 설정하므로 받지 않는다.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청 저장 요청 모델")
@Getter
@Setter
public class PurchaseRequestSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "요청일", example = "2026-11-12")
    private LocalDate requestDt;

    @Schema(description = "비고", example = "생산 라인 소모품")
    private String remark;

    @Schema(description = "구매요청 상세 목록")
    private List<PurchaseRequestDetailSaveRequestVO> details;
}
