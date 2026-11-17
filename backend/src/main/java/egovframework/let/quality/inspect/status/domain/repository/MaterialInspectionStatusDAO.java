package egovframework.let.quality.inspect.status.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.quality.inspect.status.domain.model.MaterialInspectionStatusVO;

/**
 * 자재수입검사현황 조회를 위한 테넌트 범위 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Repository("materialInspectionStatusDAO")
public class MaterialInspectionStatusDAO extends EgovAbstractMapper {

    public List<MaterialInspectionStatusVO> selectInspectionStatusList(Map<String, Object> params) throws Exception {
        return selectList("MaterialInspectionStatusDAO.selectInspectionStatusList", params);
    }
}
