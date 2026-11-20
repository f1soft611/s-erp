package egovframework.let.system.accounts.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/** 계정관리 목록 행. 비밀번호 해시·주민등록번호 등 민감 정보는 포함하지 않는다. */
@Schema(description = "계정")
@Getter
@Setter
public class AccountVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long loginId;
    private String loginCode;
    private Long userId;
    private String userNm;
    private String employeeNo;
    private String departmentNm;
    private String positionNm;
    /** 로그인 허용 여부(Y/N). */
    private String useAt;
    /** 로그인 실패 잠금 상태(locked_at 존재). */
    private boolean locked;
    /** 퇴직일이 오늘 이전인 사원(로그인 불가). */
    private boolean retired;
    private boolean passwordChangeRequired;
    /** yyyy-MM-dd HH:mm, 변경 이력이 없으면 null. */
    private String passwordChangedAt;
    private boolean hasPhoto;
    private List<AccountRoleVO> roles = new ArrayList<AccountRoleVO>();
}
