package egovframework.let.materials.receipt.closing.service;

import java.util.List;

import egovframework.let.materials.receipt.closing.domain.model.PurchaseReceiptClosingReleaseRequestVO;
import egovframework.let.materials.receipt.closing.domain.model.PurchaseReceiptClosingRequestVO;
import egovframework.let.materials.receipt.closing.domain.model.PurchaseReceiptClosingRowVO;
import egovframework.let.materials.receipt.closing.domain.model.PurchaseReceiptClosingSearchVO;
import egovframework.let.materials.receipt.closing.domain.model.PurchaseReceiptClosingSupplierVO;

/**
 * 입고 행 매입마감 조회·마감·해제 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
public interface PurchaseReceiptClosingService {

    List<PurchaseReceiptClosingSupplierVO> listSuppliers(Long tenantId, PurchaseReceiptClosingSearchVO search)
            throws Exception;

    List<PurchaseReceiptClosingRowVO> listRows(Long tenantId, PurchaseReceiptClosingSearchVO search) throws Exception;

    /** 선택한 미마감 행을 마감월로 마감하고 마감한 행 수를 돌려준다. */
    int close(Long tenantId, String userId, PurchaseReceiptClosingRequestVO payload) throws Exception;

    /** 선택한 마감 행을 해제하고 해제한 행 수를 돌려준다. */
    int release(Long tenantId, String userId, PurchaseReceiptClosingReleaseRequestVO payload) throws Exception;
}
