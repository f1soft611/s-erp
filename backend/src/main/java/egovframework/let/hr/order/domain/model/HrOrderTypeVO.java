package egovframework.let.hr.order.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "인사명령 유형(화면에서 고를 수 있는 유형)")
@Getter
@Setter
public class HrOrderTypeVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String code;
    private String name;
    @Schema(description = "변경되는 사원 항목 코드(DEPARTMENT·POSITION·LEVEL·EMPLOYMENT_TYPE·SUSPEND_DT·BACK_DT·RETIRE_DT)")
    private String fieldCode;
    private String fieldName;
    @Schema(description = "명령 후 값 입력 방식", allowableValues = { "department", "code", "date" })
    private String inputKind;
    @Schema(description = "inputKind가 code일 때의 공통코드 그룹")
    private String codeGroup;

    public static HrOrderTypeVO of(HrOrderType type) {
        HrOrderTypeVO vo = new HrOrderTypeVO();
        vo.setCode(type.name());
        vo.setName(type.getLabel());
        vo.setFieldCode(type.getField().name());
        vo.setFieldName(type.getField().getLabel());
        vo.setInputKind(type.getInputKind());
        vo.setCodeGroup(type.getCodeGroup());
        return vo;
    }
}
