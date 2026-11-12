package egovframework.let.pr.process.domain.repository;

import java.util.List;
import java.util.Map;
import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;
import egovframework.let.pr.process.domain.model.ProcessNodeVO;

@Repository("processManagementDAO")
public class ProcessManagementDAO extends EgovAbstractMapper {
    public List<ProcessNodeVO> list(Long tenantId) {
        return selectList("ProcessManagementDAO.list", tenantId);
    }

    public Long insertGroup(Map<String, Object> params) {
        return selectOne("ProcessManagementDAO.insertGroup", params);
    }

    public Long insertProcess(Map<String, Object> params) {
        return selectOne("ProcessManagementDAO.insertProcess", params);
    }

    public int updateGroup(Map<String, Object> params) {
        return update("ProcessManagementDAO.updateGroup", params);
    }

    public int updateProcess(Map<String, Object> params) {
        return update("ProcessManagementDAO.updateProcess", params);
    }

    public int deleteGroup(Map<String, Object> params) {
        return delete("ProcessManagementDAO.deleteGroup", params);
    }

    public int deleteProcess(Map<String, Object> params) {
        return delete("ProcessManagementDAO.deleteProcess", params);
    }
}
