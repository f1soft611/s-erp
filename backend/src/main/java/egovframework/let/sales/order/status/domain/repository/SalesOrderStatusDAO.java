package egovframework.let.sales.order.status.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sales.order.status.domain.model.SalesOrderStatusVO;

/**
 * 수주현황 목록 조회를 위한 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
@Repository("salesOrderStatusDAO")
public class SalesOrderStatusDAO extends EgovAbstractMapper {

    /**
     * 테넌트 범위의 사용 중인 수주를 헤더/상세 결합 행으로 조회한다.
     *
     * @param params 테넌트 ID와 선택 검색 조건
     * @return 수주현황 목록
     * @throws Exception 조회 중 발생한 예외
     */
    public List<SalesOrderStatusVO> selectOrderStatusList(Map<String, Object> params) throws Exception {
        return selectList("SalesOrderStatusDAO.selectOrderStatusList", params);
    }
}
