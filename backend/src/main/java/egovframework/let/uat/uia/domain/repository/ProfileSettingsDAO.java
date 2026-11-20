package egovframework.let.uat.uia.domain.repository;

import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.uat.uia.domain.model.MyProfileVO;

@Repository("profileSettingsDAO")
public class ProfileSettingsDAO extends EgovAbstractMapper {

    public MyProfileVO selectMyProfile(Map<String, Object> params) throws Exception {
        return (MyProfileVO) selectOne("loginDAO.selectMyProfile", params);
    }

    public void updateMyProfile(Map<String, Object> params) throws Exception {
        update("loginDAO.updateUserEmail", params);
        update("loginDAO.updateLoginImages", params);
        // 사원 마스터(tb_user.photo_image)가 원본이므로 사진을 실제로 바꾼 경우에만 함께 기록한다.
        if (Boolean.TRUE.equals(params.get("syncUserPhoto"))) {
            update("loginDAO.updateUserPhoto", params);
        }
    }

    public String selectPasswordHash(Map<String, Object> params) throws Exception {
        return (String) selectOne("loginDAO.selectCurrentPasswordHash", params);
    }

    public void updatePassword(Map<String, Object> params) throws Exception {
        update("loginDAO.updateCurrentPassword", params);
    }
}
