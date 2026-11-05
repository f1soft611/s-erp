package egovframework.let.system.policies.domain.model;
import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * SELECT 정책 선택지 VO
 * @author S-ERP
 * @since 2026.11.05
 * @version 1.0
 */
@Schema(description = "정책 선택지")
@Getter
@Setter
@NoArgsConstructor
@JsonPropertyOrder({ "value", "label" })
public class SystemPolicyOptionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "선택지 값")
    private String value;

    @Schema(description = "선택지 표시명")
    private String label;

    public SystemPolicyOptionVO(String value, String label) {
        this.value = value;
        this.label = label;
    }
}