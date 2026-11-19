package egovframework.let.co.master.itempartnerprice.service;

import java.util.List;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceCustomerOverviewCondition;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceCustomerOverviewRowVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceOverviewCondition;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceOverviewRowVO;

public interface ItemPartnerPriceOverviewService {
    /** 품목 전체와 매입·매출 기본단가, 거래처 특별단가를 부모·자식 순서의 평면 목록으로 조회한다. */
    List<ItemPriceOverviewRowVO> listOverview(Long tenantId, ItemPriceOverviewCondition condition)
            throws Exception;

    /** 거래처 기준 화면의 거래처 목록과 거래처별 등록 건수를 조회한다. */
    List<ItemPriceCustomerOverviewRowVO> listCustomerOverview(Long tenantId, ItemPriceCustomerOverviewCondition condition)
            throws Exception;
}
