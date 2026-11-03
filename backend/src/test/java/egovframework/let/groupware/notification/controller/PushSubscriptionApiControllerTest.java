package egovframework.let.groupware.notification.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionRequestVO;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionStatusVO;
import egovframework.let.groupware.notification.service.PushSubscriptionService;

class PushSubscriptionApiControllerTest {

    private final PushSubscriptionService service = mock(PushSubscriptionService.class);
    private final PushSubscriptionApiController controller =
            new PushSubscriptionApiController(new ResultVoHelper(), service);

    @Test
    void exposesAuthenticatedStatusRegisterAndOwnedSubscriptionDeleteRoutes() throws Exception {
        Method status = PushSubscriptionApiController.class.getMethod("status", String.class, LoginVO.class);
        Method register = PushSubscriptionApiController.class.getMethod(
                "register", PushSubscriptionRequestVO.class, LoginVO.class);
        Method unsubscribe = PushSubscriptionApiController.class.getMethod("unsubscribe", Long.class, LoginVO.class);

        assertThat(status.getAnnotation(GetMapping.class).value()).containsExactly("/status");
        assertThat(register.getAnnotation(PostMapping.class).value()).isEmpty();
        assertThat(unsubscribe.getAnnotation(DeleteMapping.class).value()).containsExactly("/{subscriptionId}");
        assertThat(status.getParameters()[1].getAnnotation(AuthenticationPrincipal.class)).isNotNull();
        assertThat(register.getParameters()[1].getAnnotation(AuthenticationPrincipal.class)).isNotNull();
        assertThat(unsubscribe.getParameters()[1].getAnnotation(AuthenticationPrincipal.class)).isNotNull();
    }

    @Test
    void returnsExistingResultEnvelopeWithoutAcceptingOwnerIdentifiers() throws Exception {
        LoginVO owner = new LoginVO();
        PushSubscriptionStatusVO status = new PushSubscriptionStatusVO();
        status.setEnabled(true);
        String endpointHash = repeat('a', 64);
        when(service.getStatus(any(LoginVO.class), eq(endpointHash))).thenReturn(status);

        ResultVO response = controller.status(endpointHash, owner);

        assertThat(response.getResultCode()).isEqualTo(200);
        assertThat(response.getResult()).containsEntry("enabled", true);
        verify(service).getStatus(owner, endpointHash);
    }

    private static String repeat(char value, int count) {
        char[] result = new char[count];
        java.util.Arrays.fill(result, value);
        return new String(result);
    }
}
