package egovframework.let.co.master.material.domain.repository;

import java.util.List;
import java.util.Map;
import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;
import egovframework.let.co.master.material.domain.model.MaterialInfoVO;
import egovframework.let.co.master.material.domain.model.MaterialInfoOptionVO;

@Repository("materialInfoDAO")
public class MaterialInfoDAO extends EgovAbstractMapper {
    public List<MaterialInfoVO> selectMaterialList(Map<String, Object> params) throws Exception {
        return selectList("MaterialInfoDAO.selectMaterialList", params);
    }
    public MaterialInfoVO selectMaterialById(Map<String, Object> params) throws Exception {
        return selectOne("MaterialInfoDAO.selectMaterialById", params);
    }
    public Long selectMaterialIdByCode(Map<String, Object> params) throws Exception {
        return selectOne("MaterialInfoDAO.selectMaterialIdByCode", params);
    }
    public Long insertMaterial(Map<String, Object> params) throws Exception {
        return selectOne("MaterialInfoDAO.insertMaterial", params);
    }
    public int updateMaterial(Map<String, Object> params) throws Exception {
        return update("MaterialInfoDAO.updateMaterial", params);
    }
    public List<MaterialInfoOptionVO> selectMaterialOptions(Map<String, Object> params) throws Exception {
        return selectList("MaterialInfoDAO.selectMaterialOptions", params);
    }
}
