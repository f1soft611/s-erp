package egovframework.let.materials.arrival.status.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.materials.arrival.status.domain.model.MaterialArrivalStatusVO;

/**
 * 가입고현황 조회를 위한 테넌트 범위 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
@Repository("materialArrivalStatusDAO")
public class MaterialArrivalStatusDAO extends EgovAbstractMapper {

    private static final String NS = "MaterialArrivalStatusDAO.";

    public List<MaterialArrivalStatusVO> selectArrivalStatusList(Map<String, Object> params) throws Exception {
        return selectList(NS + "selectArrivalStatusList", params);
    }
}
