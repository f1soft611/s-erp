package egovframework.let.uat.uia.service.impl;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

import javax.annotation.Resource;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.LoginVO;
import egovframework.let.system.policies.service.SystemPolicyService;
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

    @Resource(name = "systemPolicyService")
    private SystemPolicyService systemPolicyService;

    public ProfileSettingsServiceImpl() {
    }

    public ProfileSettingsServiceImpl(ProfileSettingsDAO profileSettingsDAO) {
        this.profileSettingsDAO = profileSettingsDAO;
    }

    public ProfileSettingsServiceImpl(ProfileSettingsDAO profileSettingsDAO, SystemPolicyService systemPolicyService) {
        this.profileSettingsDAO = profileSettingsDAO;
        this.systemPolicyService = systemPolicyService;
    }

    @Override
    public MyProfileVO getMyProfile(LoginVO user) throws Exception {
        MyProfileVO profile = profileSettingsDAO.selectMyProfile(authenticatedParams(user));
        if (profile != null) {
            profile.setPhotoEditable(isPhotoEditable(user.getTenantId()));
        }
        return profile;
    }

    @Override
    public MyProfileVO updateMyProfile(LoginVO user, MyProfileUpdateRequestVO request) throws Exception {
        if (request == null || request.getEmail() == null
                || !EMAIL_PATTERN.matcher(request.getEmail().trim()).matches()) {
            throw new IllegalArgumentException("이메일 형식이 올바르지 않습니다.");
        }
        Map<String, Object> params = authenticatedParams(user);
        MyProfileVO current = profileSettingsDAO.selectMyProfile(authenticatedParams(user));
        String currentImage = current == null ? null : current.getProfileImage();
        // 화면이 받은 값을 그대로 돌려보낸 경우는 사진이 바뀌지 않은 것이다(다시 해석·재압축하지 않는다).
        boolean photoChanged = !nullToEmpty(request.getProfileImage()).equals(nullToEmpty(currentImage));
        String profileImage = photoChanged
                ? ProfileImageNormalizer.normalize(request.getProfileImage())
                : (nullToEmpty(currentImage).isEmpty() ? null : currentImage);
        if (photoChanged && !isPhotoEditable(user.getTenantId())) {
            throw new IllegalArgumentException("사진은 관리자만 변경할 수 있습니다.");
        }
        params.put("email", request.getEmail().trim());
        params.put("profileImage", profileImage);
        params.put("stampImage", ProfileImageNormalizer.normalize(request.getStampImage()));
        params.put("syncUserPhoto", photoChanged);
        profileSettingsDAO.updateMyProfile(params);
        return getMyProfile(user);
    }

    /** 정책을 읽지 못해도 본인 사진 변경을 막지 않는다(기본 동작인 본인 허용). */
    private boolean isPhotoEditable(Long tenantId) {
        if (systemPolicyService == null || tenantId == null) {
            return true;
        }
        try {
            return !"ADMIN_ONLY".equals(systemPolicyService.getProfilePhotoEditMode(tenantId));
        } catch (Exception e) {
            return true;
        }
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
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
        if (request.getNewPassword().equals(request.getCurrentPassword())) {
            throw new IllegalArgumentException("새 비밀번호는 현재 비밀번호와 달라야 합니다.");
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
