package egovframework.let.co.master.customer.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "거래처 저장 요청")
@Getter
@Setter
public class CustomerInfoSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "거래처 코드. 서버에서 신규 저장 시 eGov IDS 6자리로 자동 채번하며 요청값은 무시되고, 수정 시 기존 코드가 유지됩니다.", example = "000001")
    private String customerCode;

    @Schema(description = "거래처명. 앞뒤 공백 제거 후 필수이며 같은 테넌트의 사용/미사용 거래처명과 중복 불가. 수정 시 자기 행 제외", required = true)
    private String customerName;

    @Schema(description = "거래처 약칭")
    private String custNameAbbr;

    @Schema(description = "대표자명")
    private String presidentName;

    @Schema(description = "사업자등록번호. 숫자 기준으로 같은 테넌트의 사용/미사용 번호와 중복 불가. 수정 시 자기 행 제외, 저장 표기 유지")
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

    @Schema(description = "사용 여부. 신규 미입력 시 Y, 수정 시 필수", allowableValues = { "Y", "N" }, example = "Y")
    private String useAt;
}
