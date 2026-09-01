package egovframework.let.system.menus.service;

import java.util.List;

import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.domain.model.SystemMenuPermissionSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuVO;

/**
 * 메뉴 관리를 위한 서비스 인터페이스 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
public interface SystemMenuService {

    /**
     * 테넌트 기준 메뉴 목록을 조회한다.
     *
     * @param tenantId
     * @param moduleId
     * @exception Exception
     */
    List<SystemMenuVO> listMenus(Long tenantId, Long moduleId) throws Exception;

    /**
     * 메뉴를 등록한다.
     *
     * @param tenantId
     * @param payload
     * @exception Exception
     */
    SystemMenuVO createMenu(Long tenantId, SystemMenuSaveRequestVO payload) throws Exception;

    /**
     * 메뉴를 수정한다.
     *
     * @param tenantId
     * @param menuId
     * @param payload
     * @exception Exception
     */
    SystemMenuVO updateMenu(Long tenantId, Long menuId, SystemMenuSaveRequestVO payload) throws Exception;

        /**
         * 리프 메뉴의 버튼 권한을 전체 교체한다.
         *
         * @param tenantId
         * @param menuId
         * @param payload
         * @exception Exception
         */
        SystemMenuVO replaceMenuPermissions(Long tenantId, Long menuId,
            SystemMenuPermissionSaveRequestVO payload) throws Exception;

    /**
     * 메뉴를 삭제한다. 하위 메뉴가 있으면 거부한다.
     *
     * @param tenantId
     * @param menuId
     * @exception Exception
     */
    void deleteMenu(Long tenantId, Long menuId) throws Exception;

    /**
     * 로그인 사용자의 테넌트/역할 기준 모듈-메뉴 트리를 조회한다.
     *
     * @param tenantId
     * @param userId
     * @param roleCode
     * @exception Exception
     */
    MyMenuResponseVO getMyMenuTree(Long tenantId, String userId, String roleCode) throws Exception;
}
