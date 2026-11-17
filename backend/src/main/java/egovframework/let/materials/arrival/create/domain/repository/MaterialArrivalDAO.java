package egovframework.let.materials.arrival.create.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.materials.arrival.create.domain.model.MaterialArrivalCandidateVO;
import egovframework.let.materials.arrival.create.domain.model.MaterialArrivalDetailVO;
import egovframework.let.materials.arrival.create.domain.model.MaterialArrivalOrderRowVO;
import egovframework.let.materials.arrival.create.domain.model.MaterialArrivalVO;

/**
 * 가입고 후보 조회와 가입고 저장·수정·취소를 위한 테넌트 범위 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
@Repository("materialArrivalDAO")
public class MaterialArrivalDAO extends EgovAbstractMapper {

    private static final String NS = "MaterialArrivalDAO.";

    public List<MaterialArrivalCandidateVO> selectCandidates(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectCandidates", params);
    }

    /** 발주 행 상태를 조회한다. params의 forUpdate가 true이면 행을 ID 순서로 잠근다. */
    public List<MaterialArrivalOrderRowVO> selectOrderRows(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectOrderRows", params);
    }

    public Long insertArrivalHeader(Map<String, Object> params) throws Exception {
        return selectOne(NS + "insertArrivalHeader", params);
    }

    public Long insertArrivalDetail(Map<String, Object> params) throws Exception {
        return selectOne(NS + "insertArrivalDetail", params);
    }

    /** 수정·취소 전에 가입고 헤더를 잠그고 조회한다. 없으면 null. */
    public MaterialArrivalVO selectArrivalForUpdate(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectArrivalForUpdate", params);
    }

    public MaterialArrivalVO selectArrival(Map<String, Object> params) throws Exception {
        return selectOne(NS + "selectArrival", params);
    }

    public List<MaterialArrivalDetailVO> selectArrivalDetails(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectArrivalDetails", params);
    }

    public int updateArrivalHeader(Map<String, Object> params) throws Exception {
        return update(NS + "updateArrivalHeader", params);
    }

    public int updateArrivalDetail(Map<String, Object> params) throws Exception {
        return update(NS + "updateArrivalDetail", params);
    }

    /** 행번호만 바꾼다(행 삭제 뒤 재정렬용). */
    public int updateArrivalDetailLineNo(Map<String, Object> params) throws Exception {
        return update(NS + "updateArrivalDetailLineNo", params);
    }

    public int deleteArrivalDetail(Map<String, Object> params) throws Exception {
        return delete(NS + "deleteArrivalDetail", params);
    }

    public int cancelArrivalHeader(Map<String, Object> params) throws Exception {
        return update(NS + "cancelArrivalHeader", params);
    }
}
