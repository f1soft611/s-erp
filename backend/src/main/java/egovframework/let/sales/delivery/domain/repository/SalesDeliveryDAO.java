package egovframework.let.sales.delivery.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sales.delivery.domain.model.SalesDeliveryDetailVO;
import egovframework.let.sales.delivery.domain.model.SalesDeliverySourceOrderHeaderVO;
import egovframework.let.sales.delivery.domain.model.SalesDeliverySourceOrderVO;
import egovframework.let.sales.delivery.domain.model.SalesDeliveryStatusVO;
import egovframework.let.sales.delivery.domain.model.SalesDeliveryVO;

@Repository("salesDeliveryDAO")
public class SalesDeliveryDAO extends EgovAbstractMapper {
    public boolean existsActiveCustomer(Map<String, Object> params) throws Exception {
        return Boolean.TRUE.equals(selectOne("SalesDeliveryDAO.existsActiveCustomer", params));
    }

    public boolean existsActiveMaterial(Map<String, Object> params) throws Exception {
        return Boolean.TRUE.equals(selectOne("SalesDeliveryDAO.existsActiveMaterial", params));
    }

    public SalesDeliverySourceOrderHeaderVO lockSourceOrder(Map<String, Object> params) throws Exception {
        return selectOne("SalesDeliveryDAO.lockSourceOrder", params);
    }

    public SalesDeliverySourceOrderVO selectSourceOrderDetail(Map<String, Object> params)
            throws Exception {
        return selectOne("SalesDeliveryDAO.selectSourceOrderDetail", params);
    }

    public SalesDeliverySourceOrderVO selectSourcePlanDetail(Map<String, Object> params) throws Exception {
        return selectOne("SalesDeliveryDAO.selectSourcePlanDetail", params);
    }

    public List<SalesDeliverySourceOrderVO> selectSourceOrders(Map<String, Object> params)
            throws Exception {
        return selectList("SalesDeliveryDAO.selectSourceOrders", params);
    }

    public Long insertDeliveryHeader(Map<String, Object> params) throws Exception {
        return selectOne("SalesDeliveryDAO.insertDeliveryHeader", params);
    }

    public Long insertDeliveryDetail(Map<String, Object> params) throws Exception {
        return selectOne("SalesDeliveryDAO.insertDeliveryDetail", params);
    }

    public SalesDeliveryVO selectDelivery(Map<String, Object> params) throws Exception {
        return selectOne("SalesDeliveryDAO.selectDelivery", params);
    }

    public SalesDeliveryVO lockDeliveryHeader(Map<String, Object> params) throws Exception {
        return selectOne("SalesDeliveryDAO.lockDeliveryHeader", params);
    }

    public List<SalesDeliveryDetailVO> selectDeliveryDetails(Map<String, Object> params)
            throws Exception {
        return selectList("SalesDeliveryDAO.selectDeliveryDetails", params);
    }

    public int updateDeliveryHeader(Map<String, Object> params) throws Exception {
        return update("SalesDeliveryDAO.updateDeliveryHeader", params);
    }

    public int deleteDeliveryDetails(Map<String, Object> params) throws Exception {
        return delete("SalesDeliveryDAO.deleteDeliveryDetails", params);
    }

    public int adjustShippedQty(Map<String, Object> params) throws Exception {
        return update("SalesDeliveryDAO.adjustShippedQty", params);
    }

    public int adjustPlanDeliveredQty(Map<String, Object> params) throws Exception {
        return update("SalesDeliveryDAO.adjustPlanDeliveredQty", params);
    }

    public int softDeleteDeliveryHeader(Map<String, Object> params) throws Exception {
        return update("SalesDeliveryDAO.softDeleteDeliveryHeader", params);
    }

    public List<SalesDeliveryStatusVO> selectDeliveryStatus(Map<String, Object> params)
            throws Exception {
        return selectList("SalesDeliveryDAO.selectDeliveryStatus", params);
    }
}
