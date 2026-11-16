package egovframework.let.materials.request.create.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.materials.request.create.domain.model.PurchaseRequestDetailVO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestRequesterVO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestVO;

/**
 * 구매요청 등록/조회/수정/삭제를 위한 테넌트 범위 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Repository("purchaseRequestDAO")
public class PurchaseRequestDAO extends EgovAbstractMapper {

    private static final String NS = "PurchaseRequestDAO.";

    /** 로그인 코드에 대응하는 사용자 ID와 부서 ID를 조회한다. */
    public PurchaseRequestRequesterVO selectRequester(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectRequester", params);
    }

    /** 테넌트 범위의 사용 중 품목 계정 코드를 조회한다. 품목이 없거나 삭제됐으면 null. */
    public String selectMaterialTypeCode(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectMaterialTypeCode", params);
    }

    /** 테넌트 범위에서 사용 중인 사용용도 공통코드인지 확인한다. */
    public boolean existsUseType(Map<String, Object> params) throws Exception {
        Boolean exists = selectOne(NS + "existsUseType", params);
        return Boolean.TRUE.equals(exists);
    }

    /** 구매요청 헤더를 저장하고 생성된 ID를 반환한다. */
    public Long insertRequestHeader(Map<String, Object> params) throws Exception {
        return selectOne(NS + "insertRequestHeader", params);
    }

    /** 구매요청 상세를 저장하고 생성된 ID를 반환한다. */
    public Long insertRequestDetail(Map<String, Object> params) throws Exception {
        return selectOne(NS + "insertRequestDetail", params);
    }

    /** 사용 중인 구매요청 헤더를 이름 정보와 함께 조회한다. */
    public PurchaseRequestVO selectRequest(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectRequest", params);
    }

    /** 수정/삭제 전 사용 중인 구매요청 헤더를 잠그고 상태를 조회한다. */
    public PurchaseRequestVO selectRequestForUpdate(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectRequestForUpdate", params);
    }

    /** 구매요청 상세를 행 순번 순으로 조회한다. */
    public List<PurchaseRequestDetailVO> selectRequestDetails(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectRequestDetails", params);
    }

    /** 구매요청 헤더의 요청일과 비고를 수정한다. */
    public int updateRequestHeader(Map<String, Object> params) throws Exception {
        return update(NS + "updateRequestHeader", params);
    }

    /** 행 순번 재배치 전 기존 상세 행 순번을 임시 범위로 옮긴다. */
    public int shiftDetailLineNos(Map<String, Object> params) throws Exception {
        return update(NS + "shiftDetailLineNos", params);
    }

    /** 구매요청 상세 한 행을 수정한다. */
    public int updateRequestDetail(Map<String, Object> params) throws Exception {
        return update(NS + "updateRequestDetail", params);
    }

    /** 구매요청 상세 한 행을 삭제한다. */
    public int deleteRequestDetail(Map<String, Object> params) throws Exception {
        return delete(NS + "deleteRequestDetail", params);
    }

    /** 구매요청 헤더를 미사용 처리한다. */
    public int softDeleteRequestHeader(Map<String, Object> params) throws Exception {
        return update(NS + "softDeleteRequestHeader", params);
    }
}
