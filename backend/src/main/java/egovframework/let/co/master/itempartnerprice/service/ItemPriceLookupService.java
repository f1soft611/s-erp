package egovframework.let.co.master.itempartnerprice.service;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Map;

import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceLookupVO;

/**
 * 단가 조회 규칙을 한 곳에 모은 공통 서비스.
 * 단가 테이블과 기본 거래처 테이블은 이 서비스만 조회하고, 다른 업무는 호출만 한다.
 *
 * <p>선택 규칙: 같은 품목·거래처에서 기준일에 유효한 행, 시작일이 가장 늦은 행, 가격 ID가 가장 큰 행(공통단가는 폐지됨).
 * 통화·단가 결정은 원화단가가 있으면 KRW와 원화단가, 외화단가만 있으면 외화통화와 외화단가다.</p>
 *
 * @author S-ERP
 * @since 2026.11.20
 * @version 1.0
 */
public interface ItemPriceLookupService {

    /**
     * 거래처 지정 조회(수주 등 거래처가 먼저 정해지는 업무). 그 거래처의 기준일 유효 단가를 돌려준다. 부가세구분·부가세포함도 같이 담긴다.
     *
     * @param tradeType 매입 또는 매출
     * @return 유효한 단가가 없으면 null
     */
    ItemPriceLookupVO findPrice(Long tenantId, String tradeType, Long materialId, Long customerId, LocalDate baseDt)
            throws Exception;

    /**
     * 매입 품목별 구매처·단가 일괄 조회(구매요청확정). 단가 거래처가 1곳이면 그 거래처, 2곳 이상이면 기본 거래처를 구매처로 정하고
     * 그 거래처의 기준일 유효 단가(부가세구분·부가세포함 포함)를 채운다. 단가 거래처가 없거나, 2곳 이상인데 기본 거래처가 없는 품목은
     * 결과에 없고, 구매처는 정해졌으나 기준일 유효 단가가 없으면 구매처만 채운다.
     *
     * @return 품목 ID별 결과
     */
    Map<Long, ItemPriceLookupVO> findPurchasePrices(Long tenantId, Collection<Long> materialIds,
            LocalDate baseDt) throws Exception;
}
