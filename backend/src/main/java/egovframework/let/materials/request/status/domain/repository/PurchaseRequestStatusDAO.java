package egovframework.let.materials.request.status.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.materials.request.status.domain.model.PurchaseRequestStatusVO;

/**
 * 구매요청현황 조회 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Repository("purchaseRequestStatusDAO")
public class PurchaseRequestStatusDAO extends EgovAbstractMapper {

    /** 테넌트 범위의 구매요청현황을 품목 행 단위로 조회한다. */
    public List<PurchaseRequestStatusVO> selectRequestStatusList(Map<String, Object> params) throws Exception {
        return selectList("PurchaseRequestStatusDAO.selectRequestStatusList", params);
    }
}
