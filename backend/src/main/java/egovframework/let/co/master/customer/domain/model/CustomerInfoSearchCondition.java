package egovframework.let.co.master.customer.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "거래처 검색 조건. 입력하지 않은 조건은 검색에서 제외")
@Getter
@Setter
public class CustomerInfoSearchCondition implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "거래처 코드, 거래처명, 약칭 통합 부분 검색어")
    private String keyword;

    @Schema(description = "대표자명 부분 검색어")
    private String presidentName;

    @Schema(description = "사업자등록번호 부분 검색어")
    private String businessNo;

    @Schema(description = "법인등록번호 부분 검색어")
    private String juridNo;

    @Schema(description = "업태 부분 검색어")
    private String businessStatus1;

    @Schema(description = "종목 부분 검색어")
    private String businessItem1;

    @Schema(description = "사용 여부. 미입력 시 사용/미사용 모두 조회", allowableValues = { "Y", "N" }, example = "Y")
    private String useAt;
}
