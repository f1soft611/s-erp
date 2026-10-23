package egovframework.let.co.master.customer.domain.model;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "거래처 정보")
@Getter
@Setter
public class CustomerInfoVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "거래처 ID")
    private Long customerId;

    @Schema(description = "테넌트 ID")
    private Long tenantId;

    @Schema(description = "거래처 코드", example = "000001")
    private String customerCode;

    @Schema(description = "거래처명")
    private String customerName;

    @Schema(description = "거래처 약칭")
    private String custNameAbbr;

    @Schema(description = "대표자명")
    private String presidentName;

    @Schema(description = "사업자등록번호")
    private String businessNo;

    @Schema(description = "법인등록번호")
    private String juridNo;

    @Schema(description = "업태")
    private String businessStatus1;

    @Schema(description = "종목")
    private String businessItem1;

    @Schema(description = "우편번호")
    private String postCode;

    @Schema(description = "주소")
    private String address;

    @Schema(description = "전화번호")
    private String telephoneNo;

    @Schema(description = "팩스번호")
    private String facsimileNo;

    @Schema(description = "메모")
    private String custMemo;

    @Schema(description = "사용 여부", allowableValues = { "Y", "N" }, example = "Y")
    private String useAt;

    @Schema(description = "생성 사용자 ID")
    private Long createdBy;

    @Schema(description = "생성 일시")
    private Date createdAt;

    @Schema(description = "수정 사용자 ID")
    private Long updatedBy;

    @Schema(description = "수정 일시")
    private Date updatedAt;
}
