package egovframework.let.system.roles.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.system.roles.domain.model.SystemRoleSearchConditionVO;
import egovframework.let.system.roles.domain.model.SystemRoleVO;

/**
 * 역할 관리를 위한 데이터 접근 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Repository("systemRoleDAO")
public class SystemRoleDAO extends EgovAbstractMapper {

    /**
     * 역할 목록을 조회한다.
     */
    public List<SystemRoleVO> selectRoleList(SystemRoleSearchConditionVO condition) throws Exception {
        return selectList("SystemRoleDAO.selectRoleList", condition);
    }

    /**
     * 역할 단건을 조회한다.
     */
    public SystemRoleVO selectRoleById(Map<String, Object> params) throws Exception {
        return selectOne("SystemRoleDAO.selectRoleById", params);
    }

    /**
     * 같은 테넌트 내 역할 코드 존재 여부를 조회한다.
     */
    public Long selectRoleIdByCode(Map<String, Object> params) throws Exception {
        return selectOne("SystemRoleDAO.selectRoleIdByCode", params);
    }

    /**
     * 역할을 등록한다.
     */
    public Long insertRole(Map<String, Object> payload) throws Exception {
        return selectOne("SystemRoleDAO.insertRole", payload);
    }

    /**
     * 역할을 수정한다.
     */
    public void updateRole(Map<String, Object> payload) throws Exception {
        update("SystemRoleDAO.updateRole", payload);
    }
}
