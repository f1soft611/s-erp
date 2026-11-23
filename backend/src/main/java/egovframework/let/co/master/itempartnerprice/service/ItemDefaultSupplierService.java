package egovframework.let.co.master.itempartnerprice.service;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * 품목별 매입 기본 거래처(tb_item_default_supplier) 지정·해제·정리를 담당하는 서비스.
 * 단가 저장 트랜잭션 안에서 호출된다.
 *
 * @author S-ERP
 * @since 2026.11.20
 * @version 1.0
 */
public interface ItemDefaultSupplierService {

    /** 단가 ID들이 속한 품목 ID를 돌려준다. */
    List<Long> findMaterialIdsByPriceIds(Long tenantId, Collection<Long> priceIds) throws Exception;

    /** 단가 ID들의 품목 ID 중 저장된 거래구분이 일치하는 행의 품목만. tradeType이 비면 전체. */
    List<Long> findMaterialIdsByPriceIds(Long tenantId, Collection<Long> priceIds, String tradeType) throws Exception;

    /**
     * 사용 중 매입 단가 거래처가 2곳 이상인데 기본 거래처가 없는 품목을 "품목코드 품목명" 목록으로 돌려준다(저장 검증용).
     * 없으면 빈 목록이다.
     */
    List<String> findMaterialsMissingDefaultSupplier(Long tenantId, Collection<Long> materialIds) throws Exception;

    /** 품목별 현재 기본 거래처 ID(품목 ID → 거래처 ID)를 돌려준다. */
    Map<Long, Long> findDefaultSupplierIds(Long tenantId, Collection<Long> materialIds) throws Exception;

    /**
     * 품목의 기본 거래처를 지정하거나 바꾼다.
     * 그 거래처가 품목에 사용 중 매입 단가를 하나 이상 가지고 있어야 한다(아니면 IllegalArgumentException).
     */
    void setDefault(Long tenantId, String actor, Long materialId, Long customerId) throws Exception;

    /** 현재 기본 거래처가 지정한 거래처일 때만 해제한다. */
    void clearIfCurrent(Long tenantId, Long materialId, Long customerId) throws Exception;

    /** 기본 거래처의 사용 중 매입 단가가 하나도 남지 않은 품목의 기본 거래처를 해제하고 그 품목 ID를 돌려준다. */
    List<Long> clearOrphans(Long tenantId, Collection<Long> materialIds) throws Exception;
}
