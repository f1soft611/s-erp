package egovframework.let.system.policies.domain.model;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 시스템 정책 등록/수정 요청 VO
 * @author S-ERP
 * @since 2026.11.05
 * @version 1.0
 */
@Schema(description = "시스템 정책 저장 요청")
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class SystemPolicySaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "정책 코드(등록 후 변경 불가)")
    private String policyCode;

    @Schema(description = "정책명")
    private String policyName;

    @Schema(description = "분류")
    private String category;

    @Schema(description = "설명")
    private String description;

    @Schema(description = "값 유형(등록 후 변경 불가)")
    private String valueType;

    @Schema(description = "정책 값(raw JSON)")
    private JsonNode value;

    @Schema(description = "SELECT 선택지")
    private List<SystemPolicyOptionVO> options;

    @Schema(description = "NUMBER 최소값")
    private BigDecimal minValue;

    @Schema(description = "NUMBER 최대값")
    private BigDecimal maxValue;

    @Schema(description = "단위")
    private String unit;

    @Schema(description = "수정 시 기준 버전")
    private Integer version;
}