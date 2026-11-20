package egovframework.let.co.master.itempartnerprice.service;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Map;

import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceLookupVO;

/**
 * 단가 조회 규칙을 한 곳에 모은 공통 서비스.
 * 단가 테이블과 기본 거래처 테이블은 이 서비스만 조회하고, 다른 업무는 호출만 한다.
 *
 * <p>선택 규칙: 거래처 단가 → 공통단가(거래처 없음), 기준일에 유효한 행, 시작일이 가장 늦은 행, 가격 ID가 가장 큰 행.
 * 통화·단가 결정은 원화단가가 있으면 KRW와 원화단가, 외화단가만 있으면 외화통화와 외화단가다.</p>
 *
 * @author S-ERP
 * @since 2026.11.20
 * @version 1.0
 */
public interface ItemPriceLookupService {

    /**
     * 거래처 지정 조회. 그 거래처의 기준일 유효 단가를 찾고, 없으면 거래처 없는 공통단가를 쓴다.
     *
     * @param tradeType 매입 또는 매출
     * @return 유효한 단가가 없으면 null
     */
    ItemPriceLookupVO findPrice(Long tenantId, String tradeType, Long materialId, Long customerId, LocalDate baseDt)
            throws Exception;

    /**
     * 기본 거래처 기준 일괄 조회(매입). 품목별 기본 거래처와 그 거래처의 기준일 유효 단가를 한 번의 쿼리로 구한다.
     * 기본 거래처가 없는(또는 사용 중이 아닌) 품목은 결과에 없고, 기본 거래처는 있으나 유효한 단가가 없으면 거래처만 채운다.
     *
     * @return 품목 ID별 결과
     */
    Map<Long, ItemPriceLookupVO> findDefaultSupplierPrices(Long tenantId, Collection<Long> materialIds,
            LocalDate baseDt) throws Exception;
}
