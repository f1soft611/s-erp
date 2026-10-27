package egovframework.let.sales.order.status.service;

import java.util.List;

import egovframework.let.sales.order.status.domain.model.SalesOrderStatusSearchVO;
import egovframework.let.sales.order.status.domain.model.SalesOrderStatusVO;

/**
 * 수주현황 조회 업무 처리를 위한 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
public interface SalesOrderStatusService {

    /**
     * 검색 조건을 정규화/검증한 뒤 테넌트 범위의 수주현황을 조회한다.
     *
     * @param tenantId 인증된 사용자의 테넌트 ID
     * @param search 검색 조건 (null 허용)
     * @return 헤더와 상세를 결합한 수주현황 목록
     * @throws Exception 검증 또는 조회 중 발생한 예외 (날짜 형식/범위 오류는 400)
     */
    List<SalesOrderStatusVO> selectOrderStatusList(Long tenantId, SalesOrderStatusSearchVO search) throws Exception;
}
