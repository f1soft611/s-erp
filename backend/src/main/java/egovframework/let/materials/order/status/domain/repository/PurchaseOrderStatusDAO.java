package egovframework.let.materials.order.status.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.materials.order.status.domain.model.PurchaseOrderStatusVO;

/**
 * 발주현황 조회를 위한 테넌트 범위 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Repository("purchaseOrderStatusDAO")
public class PurchaseOrderStatusDAO extends EgovAbstractMapper {

    public List<PurchaseOrderStatusVO> selectOrderStatusList(Map<String, Object> params) throws Exception {
        return selectList("PurchaseOrderStatusDAO.selectOrderStatusList", params);
    }
}
