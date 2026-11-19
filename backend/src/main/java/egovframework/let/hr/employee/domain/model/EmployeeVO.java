package egovframework.let.hr.employee.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/** 사원(tb_user 확장) 응답. 날짜는 yyyy-MM-dd 문자열이며 주민등록번호 원문은 포함하지 않는다. */
@Schema(description = "사원")
@Getter
@Setter
public class EmployeeVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long userId;
    private String employeeNo;
    private String userNm;
    private String englishNm;
    private Long departmentId;
    private String departmentNm;
    private String positionCode;
    private String positionNm;
    private Long levelId;
    private String levelNm;
    private String genderCode;
    private String genderNm;
    private String employmentTypeCode;
    private String employmentTypeNm;
    private String nativeTypeCode;
    private String nativeTypeNm;
    private String nationalityCode;
    private String nationalityNm;
    private String birthCalendarCode;
    private String birthDt;
    private String joinDt;
    private String retireDt;
    private String suspendDt;
    private String backDt;
    private String workEndDt;
    private String admissionDt;
    private String stayFromDt;
    private String stayToDt;
    private String contractFromDt;
    private String contractToDt;
    @Schema(description = "주민등록번호 마스킹 표시값(900101-1******)")
    private String residentNoMasked;
    private String mobileNo;
    private String homePhoneNo;
    private String emailAddr;
    private String postalCode;
    private String address;
    private String addressDetail;
    @Schema(description = "실사용자(시스템 사용) 여부 Y/N")
    private String realUserAt;
    private Long loginId;
    private String loginCode;
    @Schema(description = "연결된 로그인 계정의 사용 여부 Y/N")
    private String loginUseAt;
    @Schema(description = "사원 사진(데이터 URL)")
    private String photoImage;
    @Schema(description = "재직상태 ACTIVE(재직)/LEAVE(휴직)/RETIRED(퇴직), 날짜로 계산")
    private String employmentStatus;
    @Schema(description = "사용 중인 부서의 부서장 여부 Y/N")
    private String departmentManagerYn;
}
