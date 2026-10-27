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

    /**
     * 테넌트 범위의 수주 헤더와 상세를 조회한다.
     *
     * @param tenantId 인증된 사용자의 테넌트 ID
     * @param salesOrderId 수주 ID
     * @return 수주 정보 (거래처/품목 코드와 명 포함)
     * @throws Exception 조회 중 발생한 예외 (없으면 404)
     */
    SalesOrderVO getOrder(Long tenantId, Long salesOrderId) throws Exception;

    /**
     * 수정 가능한 수주의 헤더를 갱신하고 상세를 요청 내용으로 재등록한다.
     *
     * @param tenantId 인증된 사용자의 테넌트 ID
     * @param userId 인증된 사용자의 ID
     * @param salesOrderId 수주 ID
     * @param payload 수주 수정 요청
     * @return 재조회한 수주 정보
     * @throws Exception 검증 또는 저장 중 발생한 예외 (출하 진행/상태 변경 시 409)
     */
    SalesOrderVO updateOrder(Long tenantId, String userId, Long salesOrderId,
            SalesOrderCreateRequestVO payload) throws Exception;

    /**
     * 수정 가능한 수주를 미사용 처리(소프트 삭제)한다.
     *
     * @param tenantId 인증된 사용자의 테넌트 ID
     * @param userId 인증된 사용자의 ID
     * @param salesOrderId 수주 ID
     * @throws Exception 삭제 중 발생한 예외 (출하 진행/상태 변경 시 409)
     */
    void deleteOrder(Long tenantId, String userId, Long salesOrderId) throws Exception;
}
