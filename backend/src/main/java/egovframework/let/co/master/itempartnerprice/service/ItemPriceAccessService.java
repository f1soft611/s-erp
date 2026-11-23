package egovframework.let.co.master.itempartnerprice.service;

import java.util.List;

import egovframework.com.cmm.LoginVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchSaveRequestVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportRowVO;

/**
 * 단가등록의 거래구분별 메뉴 권한(매입단가등록 / 매출단가등록)을 검사하는 서비스.
 * 내 메뉴 트리에서 거래구분의 화면 키(주소 마지막 마디)를 찾아 권한을 확인한다.
 *
 * <p>인증이 없으면 401, 권한이 없으면 403(ResponseStatusException), 거래구분 값이 올바르지 않으면 IllegalArgumentException(400).</p>
 *
 * @author S-ERP
 * @since 2026.11.23
 * @version 1.0
 */
public interface ItemPriceAccessService {

    /** 메뉴 권한 종류. READ는 읽기뿐 아니라 쓰기 권한(등록·수정)이 있어도 허용한다. */
    enum Operation { READ, CREATE, UPDATE, DELETE }

    /** 거래구분 화면의 권한을 확인하고 테넌트 ID를 돌려준다. */
    Long requirePermission(LoginVO user, String tradeType, Operation operation) throws Exception;

    /** 엑셀 검증 행에 나온 거래구분마다 CREATE 권한을 확인한다. */
    void requireImportPermission(LoginVO user, List<ItemPartnerPriceImportRowVO> rows) throws Exception;

    /**
     * 일괄 저장 요청의 거래구분별 권한을 확인한다. 신규=CREATE, 수정=UPDATE(요청 값과 DB의 기존 행 거래구분 모두),
     * 삭제=DELETE(DB의 기존 행 거래구분). 하나라도 거부되면 예외를 던지고 저장은 시작하지 않는다.
     */
    void requireBatchPermission(LoginVO user, ItemPartnerPriceBatchSaveRequestVO payload) throws Exception;
}
