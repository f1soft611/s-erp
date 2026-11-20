package egovframework.let.hr.order.domain.model;

import org.springframework.util.StringUtils;

import egovframework.let.hr.employee.domain.model.EmployeeVO;

/** 인사명령 이력이 추적하는 사원 항목. 값은 코드/ID(날짜는 yyyy-MM-dd)와 표시 이름을 함께 남긴다. */
public enum HrOrderField {

    DEPARTMENT("부서"),
    POSITION("직위"),
    LEVEL("직급"),
    EMPLOYMENT_TYPE("근무형태"),
    JOIN_DT("입사일"),
    RETIRE_DT("퇴직일"),
    SUSPEND_DT("휴직일"),
    BACK_DT("복직일");

    private final String label;

    HrOrderField(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    /** 사원의 이 항목 값(없으면 null). */
    public String valueOf(EmployeeVO employee) {
        switch (this) {
            case DEPARTMENT:
                return employee.getDepartmentId() == null ? null : String.valueOf(employee.getDepartmentId());
            case POSITION:
                return blankToNull(employee.getPositionCode());
            case LEVEL:
                return employee.getLevelId() == null ? null : String.valueOf(employee.getLevelId());
            case EMPLOYMENT_TYPE:
                return blankToNull(employee.getEmploymentTypeCode());
            case JOIN_DT:
                return blankToNull(employee.getJoinDt());
            case RETIRE_DT:
                return blankToNull(employee.getRetireDt());
            case SUSPEND_DT:
                return blankToNull(employee.getSuspendDt());
            case BACK_DT:
                return blankToNull(employee.getBackDt());
            default:
                return null;
        }
    }

    /** 사원의 이 항목 표시 이름. 날짜는 값 그대로, 코드·ID 항목은 이름(없으면 null). */
    public String nameOf(EmployeeVO employee) {
        switch (this) {
            case DEPARTMENT:
                return blankToNull(employee.getDepartmentNm());
            case POSITION:
                return blankToNull(employee.getPositionNm());
            case LEVEL:
                return blankToNull(employee.getLevelNm());
            case EMPLOYMENT_TYPE:
                return blankToNull(employee.getEmploymentTypeNm());
            default:
                return valueOf(employee);
        }
    }

    public static String labelOf(String code) {
        for (HrOrderField field : values()) {
            if (field.name().equals(code)) {
                return field.label;
            }
        }
        return code;
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
