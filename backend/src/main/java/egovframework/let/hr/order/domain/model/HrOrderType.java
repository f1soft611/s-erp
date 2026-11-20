package egovframework.let.hr.order.domain.model;

/**
 * 인사명령 유형. 처음에는 현재 구현된 사원 항목 기준으로만 두고 점차 늘린다.
 * JOIN(입사)·DIRECT_EDIT(직접 수정)은 이력에만 쓰이고 화면에서 고를 수 없다.
 */
public enum HrOrderType {

    TRANSFER("부서이동", HrOrderField.DEPARTMENT, "department", null, true),
    PROMOTION("승진", HrOrderField.POSITION, "code", "POSITION", true),
    GRADE_UP("승급", HrOrderField.LEVEL, "code", "LEVEL", true),
    EMPLOYMENT_TYPE_CHANGE("근무형태변경", HrOrderField.EMPLOYMENT_TYPE, "code", "EMPLOYMENT_TYPE", true),
    LEAVE("휴직", HrOrderField.SUSPEND_DT, "date", null, true),
    RETURN("복직", HrOrderField.BACK_DT, "date", null, true),
    RETIRE("퇴직", HrOrderField.RETIRE_DT, "date", null, true),
    JOIN("입사", HrOrderField.JOIN_DT, "date", null, false),
    DIRECT_EDIT("직접 수정", null, null, null, false);

    private final String label;
    private final HrOrderField field;
    private final String inputKind;
    private final String codeGroup;
    private final boolean selectable;

    HrOrderType(String label, HrOrderField field, String inputKind, String codeGroup, boolean selectable) {
        this.label = label;
        this.field = field;
        this.inputKind = inputKind;
        this.codeGroup = codeGroup;
        this.selectable = selectable;
    }

    public String getLabel() {
        return label;
    }

    public HrOrderField getField() {
        return field;
    }

    /** 명령 후 값 입력 방식: department(부서 선택)·code(공통코드)·date(날짜). */
    public String getInputKind() {
        return inputKind;
    }

    public String getCodeGroup() {
        return codeGroup;
    }

    /** 인사명령 화면에서 고를 수 있는 유형인지. */
    public boolean isSelectable() {
        return selectable;
    }

    public boolean isDateInput() {
        return "date".equals(inputKind);
    }

    /** 화면에서 고를 수 있는 유형만 찾는다(그 밖의 코드는 null). */
    public static HrOrderType selectableOf(String code) {
        for (HrOrderType type : values()) {
            if (type.selectable && type.name().equals(code)) {
                return type;
            }
        }
        return null;
    }

    public static String labelOf(String code) {
        for (HrOrderType type : values()) {
            if (type.name().equals(code)) {
                return type.label;
            }
        }
        return code;
    }
}
