package egovframework.let.uat.uia.service.impl;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

import egovframework.com.cmm.LoginVO;
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
