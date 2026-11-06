package egovframework.let.system.policies.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.system.policies.domain.model.SystemPolicyHistoryVO;
import egovframework.let.system.policies.domain.model.SystemPolicyTenantValueVO;
import egovframework.let.system.policies.domain.model.SystemPolicyUserVO;
import egovframework.let.system.policies.domain.model.SystemPolicyVO;

/**
 * 시스템 정책 관리를 위한 데이터 접근 클래스
 * @author S-ERP
 * @since 2026.11.05
 * @version 1.0
 */
@Repository("systemPolicyDAO")
public class SystemPolicyDAO extends EgovAbstractMapper {

    private static final String NS = "SystemPolicyDAO.";

    public List<SystemPolicyVO> selectPolicyList(Long tenantId) throws Exception {
        return selectList(NS + "selectPolicyList", tenantId);
    }

    public SystemPolicyVO selectPolicyById(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectPolicyById", params);
    }

    public SystemPolicyVO selectPolicyByIdForUpdate(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectPolicyByIdForUpdate", params);
    }

    public Long selectPolicyIdByCode(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectPolicyIdByCode", params);
    }

    public SystemPolicyTenantValueVO selectTenantPolicyValuesForUpdate(Long tenantId) throws Exception {
        return selectOne(NS + "selectTenantPolicyValuesForUpdate", tenantId);
    }

    public boolean existsDeliveryPlanHeader(Long tenantId) throws Exception {
        Boolean exists = selectOne(NS + "existsDeliveryPlanHeader", tenantId);
        return Boolean.TRUE.equals(exists);
    }

    public Long insertPolicy(Map<String, Object> params) throws Exception {
        return selectOne(NS + "insertPolicy", params);
    }

    public int updatePolicy(Map<String, Object> params) throws Exception {
        return update(NS + "updatePolicy", params);
    }

    public int updateTenantDeliveryPlanMode(Map<String, Object> params) throws Exception {
        return update(NS + "updateTenantDeliveryPlanMode", params);
    }

    public int updateTenantOverDeliveryPolicy(Map<String, Object> params) throws Exception {
        return update(NS + "updateTenantOverDeliveryPolicy", params);
    }

    public int deletePolicy(Map<String, Object> params) throws Exception {
        return delete(NS + "deletePolicy", params);
    }

    public int insertPolicyHistory(Map<String, Object> params) throws Exception {
        return insert(NS + "insertPolicyHistory", params);
    }

    public List<SystemPolicyHistoryVO> selectPolicyHistoryList(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectPolicyHistoryList", params);
    }

    public List<SystemPolicyUserVO> selectActiveUsers(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectActiveUsers", params);
    }

    public int countActiveUsersByIds(Map<String, Object> params) throws Exception {
        Integer count = selectOne(NS + "countActiveUsersByIds", params);
        return count == null ? 0 : count;
    }
}