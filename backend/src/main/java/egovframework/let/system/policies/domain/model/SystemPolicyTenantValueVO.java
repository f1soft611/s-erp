package egovframework.let.system.policies.domain.model;
import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 기본 정책의 실제 원천인 테넌트 컬럼 값 VO
 * @author S-ERP
 * @since 2026.11.05
 * @version 1.0
 */
@Getter
@Setter
public class SystemPolicyTenantValueVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String deliveryPlanMode;

    private String overDeliveryPolicy;
}