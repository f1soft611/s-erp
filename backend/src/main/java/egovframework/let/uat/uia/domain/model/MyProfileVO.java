package egovframework.let.uat.uia.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MyProfileVO {
    private String userId;
    private Long employeeId;
    private String name;
    private String email;
    private String departmentName;
    private String levelName;
    private String profileImage;
    private String stampImage;
    /** 사번(사원 마스터). */
    private String employeeNo;
    /** 직위명(공통코드 POSITION). */
    private String positionNm;
    /** 내 정보에서 본인이 사진을 바꿀 수 있는지(정책 PROFILE_PHOTO_EDIT_MODE). */
    private boolean photoEditable = true;
}
