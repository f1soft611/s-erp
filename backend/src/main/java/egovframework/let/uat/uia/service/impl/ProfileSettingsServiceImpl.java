package egovframework.let.uat.uia.service.impl;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

import javax.annotation.Resource;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.LoginVO;
import egovframework.let.uat.uia.domain.model.MyProfileUpdateRequestVO;
import egovframework.let.uat.uia.domain.model.MyProfileVO;
import egovframework.let.uat.uia.domain.model.PasswordChangeRequestVO;
import egovframework.let.uat.uia.domain.repository.ProfileSettingsDAO;
import egovframework.let.uat.uia.service.ProfileSettingsService;
import egovframework.let.utl.sim.service.EgovFileScrty;

@Service("profileSettingsService")
public class ProfileSettingsServiceImpl extends EgovAbstractServiceImpl implements ProfileSettingsService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    @Resource(name = "profileSettingsDAO")
    private ProfileSettingsDAO profileSettingsDAO;

    public ProfileSettingsServiceImpl() {
    }

    public ProfileSettingsServiceImpl(ProfileSettingsDAO profileSettingsDAO) {
        this.profileSettingsDAO = profileSettingsDAO;
    }

    @Override
    public MyProfileVO getMyProfile(LoginVO user) throws Exception {
        return profileSettingsDAO.selectMyProfile(authenticatedParams(user));
    }

    @Override
    public MyProfileVO updateMyProfile(LoginVO user, MyProfileUpdateRequestVO request) throws Exception {
        if (request == null || request.getEmail() == null
                || !EMAIL_PATTERN.matcher(request.getEmail().trim()).matches()) {
            throw new IllegalArgumentException("이메일 형식이 올바르지 않습니다.");
        }
        Map<String, Object> params = authenticatedParams(user);
        params.put("email", request.getEmail().trim());
        params.put("profileImage", ProfileImageNormalizer.normalize(request.getProfileImage()));
        params.put("stampImage", ProfileImageNormalizer.normalize(request.getStampImage()));
        profileSettingsDAO.updateMyProfile(params);
        return profileSettingsDAO.selectMyProfile(authenticatedParams(user));
    }

    @Override
    public void changeMyPassword(LoginVO user, PasswordChangeRequestVO request) throws Exception {
        if (request == null || isBlank(request.getCurrentPassword())
                || isBlank(request.getNewPassword())
                || isBlank(request.getNewPasswordConfirm())) {
            throw new IllegalArgumentException("비밀번호를 입력해 주세요.");
        }
        if (!request.getNewPassword().equals(request.getNewPasswordConfirm())) {
            throw new IllegalArgumentException("변경 비밀번호와 확인값이 일치하지 않습니다.");
        }
        if (request.getNewPassword().length() < 8) {
            throw new IllegalArgumentException("변경 비밀번호는 8자 이상이어야 합니다.");
        }

        Map<String, Object> params = authenticatedParams(user);
        String passwordHash = profileSettingsDAO.selectPasswordHash(params);
        String currentHash = EgovFileScrty.encryptPassword(
                request.getCurrentPassword(), user.getId());
        if (passwordHash == null || !passwordHash.equals(currentHash)) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }

        Map<String, Object> updateParams = authenticatedParams(user);
        updateParams.put("password", EgovFileScrty.encryptPassword(
                request.getNewPassword(), user.getId()));
        profileSettingsDAO.updatePassword(updateParams);
    }

    private Map<String, Object> authenticatedParams(LoginVO user) {
        if (user == null || user.getTenantId() == null || isBlank(user.getId())) {
            throw new IllegalArgumentException("인증된 사용자 정보가 없습니다.");
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", user.getTenantId());
        params.put("loginCode", user.getId().trim());
        return params;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
