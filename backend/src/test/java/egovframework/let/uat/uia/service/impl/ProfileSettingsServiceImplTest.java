package egovframework.let.uat.uia.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

import egovframework.com.cmm.LoginVO;
import egovframework.let.system.policies.service.SystemPolicyService;
import egovframework.let.uat.uia.domain.model.MyProfileVO;
import egovframework.let.uat.uia.domain.model.MyProfileUpdateRequestVO;
import egovframework.let.uat.uia.domain.model.PasswordChangeRequestVO;
import egovframework.let.uat.uia.domain.repository.ProfileSettingsDAO;

class ProfileSettingsServiceImplTest {

    @Test
    void updateProfileUsesAuthenticatedLoginIdentifiers() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao);
        LoginVO user = authenticatedUser();
        MyProfileUpdateRequestVO request = new MyProfileUpdateRequestVO();
        request.setEmail("new@example.com");
        request.setProfileImage(null);
        request.setStampImage(null);

        service.updateMyProfile(user, request);

        verify(dao).updateMyProfile(argThat(params ->
                Long.valueOf(7L).equals(params.get("tenantId"))
                && "admin".equals(params.get("loginCode"))
                        && "new@example.com".equals(params.get("email"))));
    }

    @Test
    void rejectsPasswordChangeWhenCurrentPasswordDoesNotMatch() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao);
        when(dao.selectPasswordHash(anyMap())).thenReturn("different-hash");
        PasswordChangeRequestVO request = passwordRequest("wrong", "new-password", "new-password");

        assertThrows(IllegalArgumentException.class, () ->
                service.changeMyPassword(authenticatedUser(), request));

        verify(dao, never()).updatePassword(anyMap());
    }

    @Test
    void rejectsPasswordChangeWhenConfirmationDoesNotMatch() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao);
        PasswordChangeRequestVO request = passwordRequest("current-password", "new-password", "other-password");

        assertThrows(IllegalArgumentException.class, () ->
                service.changeMyPassword(authenticatedUser(), request));

        verify(dao, never()).updatePassword(anyMap());
    }

    @Test
    void rejectsANewPasswordThatEqualsTheCurrentOne() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao);
        PasswordChangeRequestVO request = passwordRequest("same-password", "same-password", "same-password");

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
                service.changeMyPassword(authenticatedUser(), request));

        org.junit.jupiter.api.Assertions.assertEquals("새 비밀번호는 현재 비밀번호와 달라야 합니다.", error.getMessage());
        verify(dao, never()).updatePassword(anyMap());
    }

    // ---- 사진 변경 정책 ----

    /** 저장되어 있는 사진(서버가 이미 정규화해 둔 값이라 다시 해석하지 않는다). */
    private static final String PHOTO = "data:image/png;base64,STORED";
    /** 새로 올린 사진: 서버가 읽을 수 있는 실제 PNG여야 한다. */
    private static final String OTHER_PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

    private static MyProfileVO profileWithPhoto(String photo) {
        MyProfileVO profile = new MyProfileVO();
        profile.setUserId("admin");
        profile.setProfileImage(photo);
        return profile;
    }

    private static MyProfileUpdateRequestVO updateRequest(String photo) {
        MyProfileUpdateRequestVO request = new MyProfileUpdateRequestVO();
        request.setEmail("new@example.com");
        request.setProfileImage(photo);
        return request;
    }

    private static SystemPolicyService photoMode(String mode) throws Exception {
        SystemPolicyService policy = mock(SystemPolicyService.class);
        when(policy.getProfilePhotoEditMode(7L)).thenReturn(mode);
        return policy;
    }

    @Test
    void adminOnlyPolicyRejectsAChangedPhotoAndWritesNothing() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        when(dao.selectMyProfile(anyMap())).thenReturn(profileWithPhoto(PHOTO));
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao, photoMode("ADMIN_ONLY"));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
                service.updateMyProfile(authenticatedUser(), updateRequest(OTHER_PHOTO)));

        assertEquals("사진은 관리자만 변경할 수 있습니다.", error.getMessage());
        verify(dao, never()).updateMyProfile(anyMap());
    }

    @Test
    void adminOnlyPolicyRejectsRemovingThePhoto() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        when(dao.selectMyProfile(anyMap())).thenReturn(profileWithPhoto(PHOTO));
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao, photoMode("ADMIN_ONLY"));

        assertThrows(IllegalArgumentException.class, () ->
                service.updateMyProfile(authenticatedUser(), updateRequest(null)));
        verify(dao, never()).updateMyProfile(anyMap());
    }

    @Test
    void adminOnlyPolicyStillAllowsSavingOtherFieldsWithTheSamePhoto() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        when(dao.selectMyProfile(anyMap())).thenReturn(profileWithPhoto(PHOTO));
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao, photoMode("ADMIN_ONLY"));

        service.updateMyProfile(authenticatedUser(), updateRequest(PHOTO));

        verify(dao).updateMyProfile(argThat(params -> Boolean.FALSE.equals(params.get("syncUserPhoto"))));
    }

    @Test
    void anAbsentPhotoCountsAsUnchangedWhenThereWasNone() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        when(dao.selectMyProfile(anyMap())).thenReturn(profileWithPhoto(null));
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao, photoMode("ADMIN_ONLY"));

        service.updateMyProfile(authenticatedUser(), updateRequest(""));

        verify(dao).updateMyProfile(anyMap());
    }

    @Test
    void selfPolicyAllowsAChangedPhotoAndSyncsTheEmployeeMaster() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        when(dao.selectMyProfile(anyMap())).thenReturn(profileWithPhoto(PHOTO));
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao, photoMode("SELF"));

        service.updateMyProfile(authenticatedUser(), updateRequest(OTHER_PHOTO));

        verify(dao).updateMyProfile(argThat(params ->
                Boolean.TRUE.equals(params.get("syncUserPhoto"))
                        && String.valueOf(params.get("profileImage")).startsWith("data:image/png;base64,")));
    }

    @Test
    void unchangedPhotoDoesNotOverwriteTheEmployeeMaster() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        when(dao.selectMyProfile(anyMap())).thenReturn(profileWithPhoto(null));
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao, photoMode("SELF"));

        service.updateMyProfile(authenticatedUser(), updateRequest(null));

        verify(dao).updateMyProfile(argThat(params -> Boolean.FALSE.equals(params.get("syncUserPhoto"))));
    }

    @Test
    void profileTellsTheScreenWhetherThePhotoIsEditable() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        when(dao.selectMyProfile(anyMap())).thenReturn(profileWithPhoto(PHOTO));

        assertFalse(new ProfileSettingsServiceImpl(dao, photoMode("ADMIN_ONLY"))
                .getMyProfile(authenticatedUser()).isPhotoEditable());
        assertTrue(new ProfileSettingsServiceImpl(dao, photoMode("SELF"))
                .getMyProfile(authenticatedUser()).isPhotoEditable());
        assertTrue(new ProfileSettingsServiceImpl(dao).getMyProfile(authenticatedUser()).isPhotoEditable());
    }

    @Test
    void aPolicyReadFailureDoesNotLockThePhotoOut() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        when(dao.selectMyProfile(anyMap())).thenReturn(profileWithPhoto(PHOTO));
        SystemPolicyService policy = mock(SystemPolicyService.class);
        when(policy.getProfilePhotoEditMode(7L)).thenThrow(new IllegalStateException("db down"));

        assertTrue(new ProfileSettingsServiceImpl(dao, policy).getMyProfile(authenticatedUser()).isPhotoEditable());
    }

    private static LoginVO authenticatedUser() {
        LoginVO user = new LoginVO();
        user.setTenantId(7L);
        user.setId("admin");
        user.setUniqId("11");
        return user;
    }

    private static PasswordChangeRequestVO passwordRequest(
            String currentPassword,
            String newPassword,
            String confirmation) {
        PasswordChangeRequestVO request = new PasswordChangeRequestVO();
        request.setCurrentPassword(currentPassword);
        request.setNewPassword(newPassword);
        request.setNewPasswordConfirm(confirmation);
        return request;
    }
}
