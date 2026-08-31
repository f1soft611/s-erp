package egovframework.let.system.menus.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.system.menus.domain.model.SystemMenuSearchConditionVO;
import egovframework.let.system.menus.domain.model.SystemMenuVO;

/**
 * 메뉴 관리를 위한 데이터 접근 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Repository("systemMenuDAO")
public class SystemMenuDAO extends EgovAbstractMapper {

    /**
     * 메뉴 목록을 조회한다.
     */
    public List<SystemMenuVO> selectMenuList(SystemMenuSearchConditionVO condition) throws Exception {
        return selectList("SystemMenuDAO.selectMenuList", condition);
    }

    /**
     * 테넌트 기준 사용중인 메뉴 전체(모듈 정보 포함)를 조회한다. 사용자 메뉴 트리 구성용.
     */
    public List<SystemMenuVO> selectActiveMenusForTenant(Long tenantId) throws Exception {
        return selectList("SystemMenuDAO.selectActiveMenusForTenant", tenantId);
    }

    /**
     * 메뉴 단건을 조회한다.
     */
    public SystemMenuVO selectMenuById(Map<String, Object> params) throws Exception {
        return selectOne("SystemMenuDAO.selectMenuById", params);
    }

    /**
     * 같은 테넌트 내 메뉴 코드 존재 여부를 조회한다.
     */
    public Long selectMenuIdByCode(Map<String, Object> params) throws Exception {
        return selectOne("SystemMenuDAO.selectMenuIdByCode", params);
    }

    /**
     * 메뉴를 등록한다.
     */
    public Long insertMenu(Map<String, Object> payload) throws Exception {
        return selectOne("SystemMenuDAO.insertMenu", payload);
    }

    /**
     * 메뉴를 수정한다.
     */
    public void updateMenu(Map<String, Object> payload) throws Exception {
        update("SystemMenuDAO.updateMenu", payload);
    }

    /**
     * 메뉴를 삭제한다.
     */
    public void deleteMenu(Map<String, Object> params) throws Exception {
        delete("SystemMenuDAO.deleteMenu", params);
    }

    /**
     * 하위 메뉴 개수를 조회한다.
     */
    public int countChildMenus(Map<String, Object> params) throws Exception {
        Integer count = selectOne("SystemMenuDAO.countChildMenus", params);
        return count == null ? 0 : count;
    }
}
