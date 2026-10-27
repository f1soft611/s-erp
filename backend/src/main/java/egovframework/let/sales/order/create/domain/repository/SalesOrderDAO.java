package egovframework.let.sales.order.create.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sales.order.create.domain.model.SalesOrderDetailVO;
import egovframework.let.sales.order.create.domain.model.SalesOrderVO;

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

    /**
     * 테넌트 범위의 사용 중인 수주 헤더를 거래처 코드/명과 함께 조회한다.
     *
     * @param params 테넌트 ID와 수주 ID
     * @return 수주 헤더, 없으면 null
     * @throws Exception 조회 중 발생한 예외
     */
    public SalesOrderVO selectOrder(Map<String, Object> params) throws Exception {
        return selectOne("SalesOrderDAO.selectOrder", params);
    }

    /**
     * 수주 상세를 품목 코드/명과 함께 순번 순서로 조회한다.
     *
     * @param params 테넌트 ID와 수주 ID
     * @return 수주 상세 목록
     * @throws Exception 조회 중 발생한 예외
     */
    public List<SalesOrderDetailVO> selectOrderDetails(Map<String, Object> params) throws Exception {
        return selectList("SalesOrderDAO.selectOrderDetails", params);
    }

    /**
     * 출하수량이 있는 수주 상세 건수를 조회한다.
     *
     * @param params 테넌트 ID와 수주 ID
     * @return 출하가 진행된 상세 건수
     * @throws Exception 조회 중 발생한 예외
     */
    public int countShippedDetails(Map<String, Object> params) throws Exception {
        Integer count = selectOne("SalesOrderDAO.countShippedDetails", params);
        return count == null ? 0 : count;
    }

    /**
     * 수주 헤더를 수정한다. 수주번호는 변경하지 않는다.
     *
     * @param params 수주 헤더 수정 값
     * @return 수정된 행 수
     * @throws Exception 수정 중 발생한 예외
     */
    public int updateOrderHeader(Map<String, Object> params) throws Exception {
        return update("SalesOrderDAO.updateOrderHeader", params);
    }

    /**
     * 수주의 상세 행을 모두 삭제한다.
     *
     * @param params 테넌트 ID와 수주 ID
     * @return 삭제된 행 수
     * @throws Exception 삭제 중 발생한 예외
     */
    public int deleteOrderDetails(Map<String, Object> params) throws Exception {
        return delete("SalesOrderDAO.deleteOrderDetails", params);
    }

    /**
     * 수주 헤더를 미사용(use_at = 'N') 처리한다.
     *
     * @param params 테넌트 ID, 수주 ID, 수정자 ID
     * @return 수정된 행 수
     * @throws Exception 수정 중 발생한 예외
     */
    public int softDeleteOrderHeader(Map<String, Object> params) throws Exception {
        return update("SalesOrderDAO.softDeleteOrderHeader", params);
    }
}
