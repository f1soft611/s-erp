package egovframework.let.co.master.company.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "회사정보")
@Getter
@Setter
public class CompanyInfoVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "회사명", example = "Example Co.")
    private String companyName;

    @Schema(description = "사업자등록번호", example = "123-45-67890")
    private String businessNo;

    @Schema(description = "업종")
    private String businessType;

    @Schema(description = "업태")
    private String businessCategory;

    @Schema(description = "대표자명")
    private String presidentName;

    @Schema(description = "우편번호")
    private String postCode;

    @Schema(description = "주소")
    private String address;

    @Schema(description = "전화번호")
    private String telephoneNo;

    @Schema(description = "팩스번호")
    private String facsimileNo;

    @Schema(description = "회사 직인 이미지 데이터 URL")
    private String stampImage;
}
