package egovframework.let.materials.arrival.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 가입고 헤더와 상세 행 조회 결과를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
@Schema(description = "가입고 헤더와 상세 행 조회 결과 모델")
@Getter
@Setter
public class MaterialArrivalVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "가입고 ID", example = "800")
    private Long materialArrivalId;

    @Schema(description = "가입고번호", example = "MP-20261116-0001")
    private String arrivalNo;

    @Schema(description = "가입고일", example = "2026-11-16")
    private LocalDate arrivalDt;

    @Schema(description = "구매처 ID", example = "4")
    private Long supplierId;

    @Schema(description = "구매처 코드", example = "213231")
    private String supplierCode;

    @Schema(description = "구매처명", example = "테스트")
    private String supplierName;

    @Schema(description = "담당자 이름", example = "홍길동")
    private String receiverName;

    @Schema(description = "통화 코드", example = "KRW")
    private String currencyCode;

    @Schema(description = "세금 구분 코드(TAXABLE 과세, ZERO_RATED 영세, EXEMPT 면세)", example = "TAXABLE")
    private String taxType;

    @Schema(description = "부가세 포함 여부(Y 포함, N 별도)", example = "N")
    private String vatIncludedAt;

    @Schema(description = "공급가액", example = "10000")
    private BigDecimal supplyAmt;

    @Schema(description = "부가세액", example = "1000")
    private BigDecimal vatAmt;

    @Schema(description = "합계금액", example = "11000")
    private BigDecimal totalAmt;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "사용 여부(Y 사용, N 취소·삭제)", example = "Y")
    private String useAt;

    @Schema(description = "등록자(로그인 ID)", example = "admin")
    private String createdBy;

    @Schema(description = "등록 일시", example = "2026-11-17T10:00:00")
    private LocalDateTime createdAt;

    @Schema(description = "수정자(로그인 ID)", example = "admin")
    private String updatedBy;

    @Schema(description = "수정 일시", example = "2026-11-17T11:00:00")
    private LocalDateTime updatedAt;

    @Schema(description = "상세 행 목록")
    private List<MaterialArrivalDetailVO> details;

    @Schema(description = "가입고 저장 직후 무검사 행으로 자동 생성된 입고 번호·행 수(저장 응답에만 채운다)", example = "MI-20261117-0001")
    private String autoReceiptNo;

    @Schema(description = "가입고 저장으로 자동 생성된 입고(무검사) 건수", example = "1")
    private Integer autoReceiptCount;
}
