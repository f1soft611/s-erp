package egovframework.let.materials.receipt.closing.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.materials.receipt.closing.domain.model.PurchaseReceiptClosingRowVO;
import egovframework.let.materials.receipt.closing.domain.model.PurchaseReceiptClosingSupplierVO;

/**
 * 매입마감 조회·마감·해제를 위한 테넌트 범위 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Repository("purchaseReceiptClosingDAO")
public class PurchaseReceiptClosingDAO extends EgovAbstractMapper {

    private static final String NS = "PurchaseReceiptClosingDAO.";

    public List<PurchaseReceiptClosingSupplierVO> selectSuppliers(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectSuppliers", params);
    }

    public List<PurchaseReceiptClosingRowVO> selectRows(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectRows", params);
    }

    /** 마감·해제 대상 행을 입고 헤더 → 상세 순서로 잠그고 현재 상태와 함께 조회한다. */
    public List<PurchaseReceiptClosingRowVO> selectRowsForUpdate(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectRowsForUpdate", params);
    }

    public int closeRow(Map<String, Object> params) throws Exception {
        return update(NS + "closeRow", params);
    }

    public int releaseRow(Map<String, Object> params) throws Exception {
        return update(NS + "releaseRow", params);
    }
}
