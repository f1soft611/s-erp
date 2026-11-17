package egovframework.let.materials.order.create.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.materials.order.create.domain.model.PurchaseOrderArrivalQtyVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderCandidateVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderConfirmRowVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderDetailVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderMaterialDefaultVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderPrintDetailVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderPrintVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderVO;

/**
 * 발주 후보 조회와 발주 저장을 위한 테넌트 범위 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Repository("purchaseOrderDAO")
public class PurchaseOrderDAO extends EgovAbstractMapper {

    private static final String NS = "PurchaseOrderDAO.";

    public List<PurchaseOrderCandidateVO> selectCandidates(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectCandidates", params);
    }

    /** 확정 행 상태를 조회한다. params의 forUpdate가 true이면 행을 ID 순서로 잠근다. */
    public List<PurchaseOrderConfirmRowVO> selectConfirmRows(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectConfirmRows", params);
    }

    public PurchaseOrderMaterialDefaultVO selectMaterialDefault(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectMaterialDefault", params);
    }

    public boolean existsTaxType(Map<String, Object> params) throws Exception {
        return Boolean.TRUE.equals(selectOne(NS + "existsTaxType", params));
    }

    public Long insertOrderHeader(Map<String, Object> params) throws Exception {
        return selectOne(NS + "insertOrderHeader", params);
    }

    public Long insertOrderDetail(Map<String, Object> params) throws Exception {
        return selectOne(NS + "insertOrderDetail", params);
    }

    /** 수정·취소 전에 발주 헤더를 잠그고 조회한다. 없으면 null. */
    public PurchaseOrderVO selectOrderForUpdate(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectOrderForUpdate", params);
    }

    public int updateOrderHeader(Map<String, Object> params) throws Exception {
        return update(NS + "updateOrderHeader", params);
    }

    public int updateOrderDetail(Map<String, Object> params) throws Exception {
        return update(NS + "updateOrderDetail", params);
    }

    /** 입고대기 마감 값만 갱신한다. 값이 같으면 0을 돌려준다. */
    public int updateReceiptClose(Map<String, Object> params) throws Exception {
        return update(NS + "updateReceiptClose", params);
    }

    public int deleteOrderDetail(Map<String, Object> params) throws Exception {
        return delete(NS + "deleteOrderDetail", params);
    }

    public int cancelOrderHeader(Map<String, Object> params) throws Exception {
        return update(NS + "cancelOrderHeader", params);
    }

    /** 직접 발주가 자동 생성한 구매요청 상세 행(확정 값 포함)을 발주 값에 맞춘다. */
    public int updateAutoRequestDetail(Map<String, Object> params) throws Exception {
        return update(NS + "updateAutoRequestDetail", params);
    }

    public int deleteAutoRequestDetail(Map<String, Object> params) throws Exception {
        return delete(NS + "deleteAutoRequestDetail", params);
    }

    public int refreshConfirmTotal(Map<String, Object> params) throws Exception {
        return update(NS + "refreshConfirmTotal", params);
    }

    /** 발주서 출력 헤더(스냅샷 우선, 없으면 현재 정보). 없으면 null. */
    public PurchaseOrderPrintVO selectOrderPrint(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectOrderPrint", params);
    }

    public List<PurchaseOrderPrintDetailVO> selectOrderPrintDetails(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectOrderPrintDetails", params);
    }

    /** 출력(인쇄)했다고 기록한다. */
    public int updatePrintMark(Map<String, Object> params) throws Exception {
        return update(NS + "updatePrintMark", params);
    }

    public PurchaseOrderVO selectOrder(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectOrder", params);
    }

    public List<PurchaseOrderDetailVO> selectOrderDetails(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectOrderDetails", params);
    }

    /** 발주 행별 유효한 가입고 수량 합. 가입고가 없는 행은 결과에 나오지 않는다. */
    public List<PurchaseOrderArrivalQtyVO> selectArrivedQtyByOrderDetail(Map<String, Object> params)
            throws Exception {
        return selectList(NS + "selectArrivedQtyByOrderDetail", params);
    }
}
