package egovframework.let.materials.request.confirm.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.materials.request.confirm.domain.model.PurchaseConfirmListItemVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseConfirmVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestConfirmCandidateVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestConfirmDetailVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestDetailLockVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseUnitPriceVO;

/**
 * 구매요청 품목 행 묶음 확정·발주대기 마감·확정 취소를 위한 테넌트 범위 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Repository("purchaseRequestConfirmDAO")
public class PurchaseRequestConfirmDAO extends EgovAbstractMapper {

    private static final String NS = "PurchaseRequestConfirmDAO.";

    public List<PurchaseRequestConfirmCandidateVO> selectCandidates(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectCandidates", params);
    }

    /** 상세 행을 ID 순서로 잠그고 소속 요청·확정 연결을 조회한다. 삭제된 요청의 행은 결과에서 빠진다. */
    public List<PurchaseRequestDetailLockVO> selectDetailLocksForUpdate(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectDetailLocksForUpdate", params);
    }

    public List<PurchaseRequestDetailLockVO> selectDetailLocks(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectDetailLocks", params);
    }

    public List<PurchaseRequestConfirmDetailVO> selectDetailsByIds(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectDetailsByIds", params);
    }

    public List<PurchaseRequestConfirmDetailVO> selectDetailsByConfirm(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectDetailsByConfirm", params);
    }

    public List<PurchaseConfirmListItemVO> selectConfirms(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectConfirms", params);
    }

    public PurchaseConfirmVO selectConfirm(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectConfirm", params);
    }

    /** 확정 메인을 잠그고 사용 여부를 조회한다. 없으면 null. */
    public String selectConfirmUseAtForUpdate(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectConfirmUseAtForUpdate", params);
    }

    /** 유효한 발주 행이 이 확정의 품목 행을 쓰고 있는지 확인한다. */
    public boolean existsActiveOrderByConfirm(Map<String, Object> params) throws Exception {
        return Boolean.TRUE.equals(selectOne(NS + "existsActiveOrderByConfirm", params));
    }

    /** 로그인 코드에 대응하는 사용자 ID를 조회한다. */
    public Long selectUserId(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectUserId", params);
    }

    public boolean existsWarehouse(Map<String, Object> params) throws Exception {
        return Boolean.TRUE.equals(selectOne(NS + "existsWarehouse", params));
    }

    public boolean existsOrderType(Map<String, Object> params) throws Exception {
        return Boolean.TRUE.equals(selectOne(NS + "existsOrderType", params));
    }

    public boolean existsSupplier(Map<String, Object> params) throws Exception {
        return Boolean.TRUE.equals(selectOne(NS + "existsSupplier", params));
    }

    public Long insertConfirmHeader(Map<String, Object> params) throws Exception {
        return selectOne(NS + "insertConfirmHeader", params);
    }

    public int updateDetailConfirm(Map<String, Object> params) throws Exception {
        return update(NS + "updateDetailConfirm", params);
    }

    /** 요청 상태(요청/부분확정/확정)와 합계를 상세 확정 여부로 다시 계산한다. */
    public int refreshRequestStatuses(Map<String, Object> params) throws Exception {
        return update(NS + "refreshRequestStatuses", params);
    }

    public List<Long> selectRequestIdsByConfirm(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectRequestIdsByConfirm", params);
    }

    public int updateDetailOrderClose(Map<String, Object> params) throws Exception {
        return update(NS + "updateDetailOrderClose", params);
    }

    public int clearDetailsByConfirm(Map<String, Object> params) throws Exception {
        return update(NS + "clearDetailsByConfirm", params);
    }

    public int cancelConfirmHeader(Map<String, Object> params) throws Exception {
        return update(NS + "cancelConfirmHeader", params);
    }

    public PurchaseUnitPriceVO selectDefaultUnitPrice(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectDefaultUnitPrice", params);
    }
}
