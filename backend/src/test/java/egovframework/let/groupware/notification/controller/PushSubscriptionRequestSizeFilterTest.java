package egovframework.let.groupware.notification.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.nio.charset.StandardCharsets;

import javax.servlet.FilterChain;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class PushSubscriptionRequestSizeFilterTest {

    @Test
    void rejectsSubscriptionBodiesLargerThanEightKilobytesBeforeControllerDispatch() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST",
                "/api/v1/groupware/push-subscriptions");
        request.setServletPath("/api/v1/groupware/push-subscriptions");
        request.setContent(new byte[8193]);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        new PushSubscriptionRequestSizeFilter().doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(413);
        verify(chain, never()).doFilter(request, response);
    }

    @Test
    void passesBoundedSubscriptionBodyToTheController() throws Exception {
        byte[] body = "{\"endpoint\":\"https://fcm.googleapis.com\"}".getBytes(StandardCharsets.UTF_8);
        MockHttpServletRequest request = new MockHttpServletRequest("POST",
                "/api/v1/groupware/push-subscriptions");
        request.setServletPath("/api/v1/groupware/push-subscriptions");
        request.setContent(body);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        new PushSubscriptionRequestSizeFilter().doFilter(request, response, chain);

        verify(chain).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.eq(response));
    }
}
