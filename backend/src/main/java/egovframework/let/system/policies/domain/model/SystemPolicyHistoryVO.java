package egovframework.let.system.policies.domain.model;
import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.fasterxml.jackson.databind.JsonNode;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 시스템 정책 변경 이력 VO
 * @author S-ERP
 * @since 2026.11.05
 * @version 1.0
 */
@Schema(description = "시스템 정책 변경 이력")
@Getter
@Setter
@JsonPropertyOrder({ "action", "changedBy", "changedAt", "beforeValue", "afterValue" })
public class SystemPolicyHistoryVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "변경 유형", allowableValues = { "CREATE", "UPDATE", "DELETE" })
    private String action;

    @Schema(description = "변경자")
    private String changedBy;

    @Schema(description = "변경 일시")
    private String changedAt;

    @Schema(description = "변경 전 값")
    private JsonNode beforeValue;

    @Schema(description = "변경 후 값")
    private JsonNode afterValue;

    @JsonIgnore
    private String beforeValueJson;

    @JsonIgnore
    private String afterValueJson;
}