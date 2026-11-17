package egovframework.let.quality.inspect.create.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.materials.request.create.domain.model.PurchaseRequestRequesterVO;
import egovframework.let.quality.inspect.create.domain.model.MaterialInspectionArrivalRowVO;
import egovframework.let.quality.inspect.create.domain.model.MaterialInspectionCandidateVO;
import egovframework.let.quality.inspect.create.domain.model.MaterialInspectionDetailVO;
import egovframework.let.quality.inspect.create.domain.model.MaterialInspectionVO;

/**
 * 자재 수입검사 저장·조회·수정·취소를 위한 테넌트 범위 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Repository("materialInspectionDAO")
public class MaterialInspectionDAO extends EgovAbstractMapper {

    private static final String NS = "MaterialInspectionDAO.";

    public List<MaterialInspectionCandidateVO> selectCandidates(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectCandidates", params);
    }

    public Integer countWaitingCandidates(Map<String, Object> params) throws Exception {
        return selectOne(NS + "countWaitingCandidates", params);
    }

    /** 가입고 행을 ID 순서로 조회한다. forUpdate가 true이면 행을 잠그고, excludeInspectionId의 검사는 검사량 합에서 뺀다. */
    public List<MaterialInspectionArrivalRowVO> selectArrivalRows(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectArrivalRows", params);
    }

    /** 검사자로 쓸 수 있는 사용자(같은 테넌트)의 ID와 부서. 없으면 null. */
    public PurchaseRequestRequesterVO selectInspector(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectInspector", params);
    }

    public Long insertInspectionHeader(Map<String, Object> params) throws Exception {
        return selectOne(NS + "insertInspectionHeader", params);
    }

    public Long insertInspectionDetail(Map<String, Object> params) throws Exception {
        return selectOne(NS + "insertInspectionDetail", params);
    }

    /** 수정·취소 전에 검사 헤더를 잠그고 조회한다. 없으면 null. */
    public MaterialInspectionVO selectInspectionForUpdate(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectInspectionForUpdate", params);
    }

    public MaterialInspectionVO selectInspection(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectInspection", params);
    }

    public List<MaterialInspectionDetailVO> selectInspectionDetails(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectInspectionDetails", params);
    }

    public int updateInspectionHeader(Map<String, Object> params) throws Exception {
        return update(NS + "updateInspectionHeader", params);
    }

    public int updateInspectionDetail(Map<String, Object> params) throws Exception {
        return update(NS + "updateInspectionDetail", params);
    }

    public int deleteInspectionDetail(Map<String, Object> params) throws Exception {
        return delete(NS + "deleteInspectionDetail", params);
    }

    public int cancelInspectionHeader(Map<String, Object> params) throws Exception {
        return update(NS + "cancelInspectionHeader", params);
    }
}
