package egovframework.let.sales.deliveryplan.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sales.delivery.domain.model.SalesDeliverySourceOrderHeaderVO;
import egovframework.let.sales.delivery.domain.model.SalesDeliverySourceOrderVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanDetailVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanVO;

@Repository("salesDeliveryPlanDAO")
public class SalesDeliveryPlanDAO extends EgovAbstractMapper {
    public String selectTenantOverDeliveryPolicy(Long tenantId) throws Exception {
        return selectOne("SalesDeliveryPlanDAO.selectTenantOverDeliveryPolicy", tenantId);
    }

    public String selectTenantMode(Long tenantId) throws Exception {
        return selectOne("SalesDeliveryPlanDAO.selectTenantMode", tenantId);
    }

    public String lockTenantModeForPlanCreation(Long tenantId) throws Exception {
        return selectOne("SalesDeliveryPlanDAO.lockTenantModeForPlanCreation", tenantId);
    }

    public SalesDeliverySourceOrderHeaderVO lockSourceOrder(Map<String, Object> params) throws Exception {
        return selectOne("SalesDeliveryPlanDAO.lockSourceOrder", params);
    }

    public SalesDeliveryPlanVO selectPlanByOrder(Map<String, Object> params) throws Exception {
        return selectOne("SalesDeliveryPlanDAO.selectPlanByOrder", params);
    }

    public SalesDeliveryPlanVO selectPlanHeader(Map<String, Object> params) throws Exception {
        return selectOne("SalesDeliveryPlanDAO.selectPlanHeader", params);
    }

    public SalesDeliveryPlanVO lockPlanHeader(Map<String, Object> params) throws Exception {
        return selectOne("SalesDeliveryPlanDAO.lockPlanHeader", params);
    }

    public List<SalesDeliveryPlanDetailVO> selectPlanDetails(Map<String, Object> params) throws Exception {
        return selectList("SalesDeliveryPlanDAO.selectPlanDetails", params);
    }

    public List<SalesDeliveryPlanDetailVO> selectOrderLines(Map<String, Object> params) throws Exception {
        return selectList("SalesDeliveryPlanDAO.selectOrderLines", params);
    }

    public List<SalesDeliverySourceOrderVO> selectPlanSourceOrders(Map<String, Object> params) throws Exception {
        return selectList("SalesDeliveryPlanDAO.selectPlanSourceOrders", params);
    }

    public Long insertPlanHeader(Map<String, Object> params) throws Exception {
        return selectOne("SalesDeliveryPlanDAO.insertPlanHeader", params);
    }

    public Long insertPlanDetail(Map<String, Object> params) throws Exception {
        return selectOne("SalesDeliveryPlanDAO.insertPlanDetail", params);
    }

    public int updatePlanDetail(Map<String, Object> params) throws Exception {
        return update("SalesDeliveryPlanDAO.updatePlanDetail", params);
    }

    public int deletePlanDetail(Map<String, Object> params) throws Exception {
        return delete("SalesDeliveryPlanDAO.deletePlanDetail", params);
    }

    public int countDeliveryReferences(Map<String, Object> params) throws Exception {
        Integer count = selectOne("SalesDeliveryPlanDAO.countDeliveryReferences", params);
        return count == null ? 0 : count;
    }

    public List<SalesDeliveryPlanVO> selectPlanStatus(Map<String, Object> params) throws Exception {
        return selectList("SalesDeliveryPlanDAO.selectPlanStatus", params);
    }
}
