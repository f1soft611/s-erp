package egovframework.let.co.master.material.service;

import java.util.List;
import egovframework.let.co.master.material.domain.model.MaterialInfoVO;
import egovframework.let.co.master.material.domain.model.MaterialInfoOptionVO;
import egovframework.let.co.master.material.domain.model.MaterialInfoSaveRequestVO;
import egovframework.let.co.master.material.domain.model.MaterialInfoSearchCondition;

public interface MaterialInfoService {
    List<MaterialInfoVO> listMaterials(Long tenantId, MaterialInfoSearchCondition condition) throws Exception;
    List<MaterialInfoOptionVO> listOptions(Long tenantId) throws Exception;
    MaterialInfoVO createMaterial(Long tenantId, String actor, MaterialInfoSaveRequestVO payload) throws Exception;
    MaterialInfoVO updateMaterial(Long tenantId, String actor, Long materialId, MaterialInfoSaveRequestVO payload) throws Exception;
}
