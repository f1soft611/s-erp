package egovframework.let.sales.order.create.service;

import egovframework.let.sales.order.create.domain.model.SalesOrderCreateRequestVO;
import egovframework.let.sales.order.create.domain.model.SalesOrderVO;

/**
 * 수주 업무 처리를 위한 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
public interface SalesOrderService {

    /**
     * 요청을 검증하고 수주 헤더와 상세를 등록한다.
     *
     * @param tenantId 인증된 사용자의 테넌트 ID
     * @param userId 인증된 사용자의 ID
     * @param payload 수주 등록 요청
     * @return 저장된 수주 정보
     * @throws Exception 검증 또는 저장 중 발생한 예외
     */
    SalesOrderVO createOrder(Long tenantId, String userId, SalesOrderCreateRequestVO payload) throws Exception;
}
