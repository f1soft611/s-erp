package egovframework.let.materials.receipt.closing.service;

import java.util.List;

import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingReleaseRequestVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingRequestVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingRowVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingSearchVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingSupplierVO;

/**
 * 입고 행 매입마감 조회·마감·해제 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
public interface MaterialReceiptClosingService {

    List<MaterialReceiptClosingSupplierVO> listSuppliers(Long tenantId, MaterialReceiptClosingSearchVO search)
            throws Exception;

    List<MaterialReceiptClosingRowVO> listRows(Long tenantId, MaterialReceiptClosingSearchVO search) throws Exception;

    /** 선택한 미마감 행을 마감월로 마감하고 마감한 행 수를 돌려준다. */
    int close(Long tenantId, String userId, MaterialReceiptClosingRequestVO payload) throws Exception;

    /** 선택한 마감 행을 해제하고 해제한 행 수를 돌려준다. */
    int release(Long tenantId, String userId, MaterialReceiptClosingReleaseRequestVO payload) throws Exception;
}
