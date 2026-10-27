package egovframework.let.sales.order.create.domain.repository;

import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

/**
 * 수주 등록에 필요한 테넌트 범위 조회와 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
@Repository("salesOrderDAO")
public class SalesOrderDAO extends EgovAbstractMapper {

    /**
     * 테넌트 범위에서 거래처 존재 여부를 확인한다.
     *
     * @param params 테넌트 ID와 거래처 ID
     * @return 거래처 존재 여부
     * @throws Exception 조회 중 발생한 예외
     */
    public boolean existsCustomer(Map<String, Object> params) throws Exception {
        Boolean exists = selectOne("SalesOrderDAO.existsCustomer", params);
        return Boolean.TRUE.equals(exists);
    }

    /**
     * 테넌트 범위에서 품목 존재 여부를 확인한다.
     *
     * @param params 테넌트 ID와 품목 ID
     * @return 품목 존재 여부
     * @throws Exception 조회 중 발생한 예외
     */
    public boolean existsMaterial(Map<String, Object> params) throws Exception {
        Boolean exists = selectOne("SalesOrderDAO.existsMaterial", params);
        return Boolean.TRUE.equals(exists);
    }

    /**
     * 수주 헤더를 등록하고 생성된 기본 키를 반환한다.
     *
     * @param params 수주 헤더 저장 값
     * @return 생성된 수주 ID
     * @throws Exception 저장 중 발생한 예외
     */
    public Long insertOrderHeader(Map<String, Object> params) throws Exception {
        return selectOne("SalesOrderDAO.insertOrderHeader", params);
    }

    /**
     * 수주 상세를 등록하고 생성된 기본 키를 반환한다.
     *
     * @param params 수주 상세 저장 값
     * @return 생성된 수주 상세 ID
     * @throws Exception 저장 중 발생한 예외
     */
    public Long insertOrderDetail(Map<String, Object> params) throws Exception {
        return selectOne("SalesOrderDAO.insertOrderDetail", params);
    }
}
