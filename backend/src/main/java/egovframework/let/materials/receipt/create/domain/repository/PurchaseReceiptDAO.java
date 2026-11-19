package egovframework.let.materials.receipt.create.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptCandidateVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptDetailVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptInspectionRowVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptVO;

/**
 * 입고 저장·조회·수정·취소를 위한 테넌트 범위 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Repository("purchaseReceiptDAO")
public class PurchaseReceiptDAO extends EgovAbstractMapper {

    private static final String NS = "PurchaseReceiptDAO.";

    /** 입고 가능량이 남은 정상 수입검사 행(불러오기 창). */
    public List<PurchaseReceiptCandidateVO> selectCandidates(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectCandidates", params);
    }

    /** 조회 조건과 무관한 입고 가능 행의 전체 건수. */
    public Integer countCandidates(Map<String, Object> params) throws Exception {
        return selectOne(NS + "countCandidates", params);
    }

    /**
     * 수입검사 행을 ID 순서로 조회한다. forUpdate가 true이면 검사 행과 검사 헤더를 잠그고,
     * excludeReceiptId의 입고는 입고수량 합에서 뺀다.
     */
    public List<PurchaseReceiptInspectionRowVO> selectInspectionRows(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectInspectionRows", params);
    }

    public Long insertReceiptHeader(Map<String, Object> params) throws Exception {
        return selectOne(NS + "insertReceiptHeader", params);
    }

    public Long insertReceiptDetail(Map<String, Object> params) throws Exception {
        return selectOne(NS + "insertReceiptDetail", params);
    }

    /** 수정·취소 전에 입고 헤더를 잠그고 조회한다. 없으면 null. */
    public PurchaseReceiptVO selectReceiptForUpdate(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectReceiptForUpdate", params);
    }

    public PurchaseReceiptVO selectReceipt(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectReceipt", params);
    }

    public List<PurchaseReceiptDetailVO> selectReceiptDetails(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectReceiptDetails", params);
    }

    public int updateReceiptHeader(Map<String, Object> params) throws Exception {
        return update(NS + "updateReceiptHeader", params);
    }

    public int updateReceiptDetail(Map<String, Object> params) throws Exception {
        return update(NS + "updateReceiptDetail", params);
    }

    public int deleteReceiptDetail(Map<String, Object> params) throws Exception {
        return delete(NS + "deleteReceiptDetail", params);
    }

    public int cancelReceiptHeader(Map<String, Object> params) throws Exception {
        return update(NS + "cancelReceiptHeader", params);
    }
}
