package egovframework.let.hr.employee.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/** 사원 등록·수정 요청. 날짜는 yyyy-MM-dd 문자열, 빈 문자열은 비움으로 본다. */
@Schema(description = "사원 등록·수정 요청")
@Getter
@Setter
public class EmployeeSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "사번. 등록 시 비우면 입사년월(YYMM)+순번으로 자동 부여, 등록 후에는 수정할 수 없다")
    private String employeeNo;
    private String userNm;
    private String englishNm;
    private Long departmentId;
    private String positionCode;
    private Long levelId;
    private String genderCode;
    private String employmentTypeCode;
    private String nativeTypeCode;
    private String nationalityCode;
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
    @Schema(description = "주민등록번호(숫자 13자리, 하이픈 허용). 수정 시 비우면 기존 값 유지")
    private String residentNo;
    private String mobileNo;
    private String homePhoneNo;
    private String emailAddr;
    private String postalCode;
    private String address;
    private String addressDetail;
    @Schema(description = "실사용자 Y/N. Y이고 계정이 없으면 loginCode·initialPassword로 계정을 함께 발급한다")
    private String realUserAt;
    private String loginCode;
    private String initialPassword;
    @Schema(description = "사원 사진 데이터 URL. null이면 변경 없음, 빈 문자열이면 삭제")
    private String photoImage;
}
