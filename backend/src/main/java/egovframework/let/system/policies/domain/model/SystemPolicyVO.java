package egovframework.let.system.policies.domain.model;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.fasterxml.jackson.databind.JsonNode;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 시스템 정책 응답 VO
 * @author S-ERP
 * @since 2026.11.05
 * @version 1.0
 */
@Schema(description = "시스템 정책")
@Getter
@Setter
@JsonPropertyOrder({ "policyId", "policyCode", "policyName", "category", "description", "valueType", "value",
        "options", "minValue", "maxValue", "unit", "version", "systemPolicy", "updatedAt" })
public class SystemPolicyVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "정책 ID")
    private Long policyId;

    @Schema(description = "정책 코드")
    private String policyCode;

    @Schema(description = "정책명")
    private String policyName;

    @Schema(description = "분류")
    private String category;

    @Schema(description = "설명")
    private String description;

    @Schema(description = "값 유형", allowableValues = { "BOOLEAN", "NUMBER", "SELECT", "TEXT", "DATE", "USER_LIST" })
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

    @Schema(description = "낙관적 잠금 버전")
    private Integer version;

    @Schema(description = "시스템 기본 정책 여부")
    private boolean systemPolicy;

    @Schema(description = "수정 일시")
    private String updatedAt;

    @JsonIgnore
    private String valueJson;

    @JsonIgnore
    private String optionsJson;
}