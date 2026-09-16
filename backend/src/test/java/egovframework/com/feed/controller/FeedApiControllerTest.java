package egovframework.com.feed.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.com.feed.domain.model.FeedVO;
import egovframework.com.feed.service.FeedService;

@ExtendWith(MockitoExtension.class)
class FeedApiControllerTest {

    @Mock
    private FeedService feedService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        FeedApiController controller = new FeedApiController(new ResultVoHelper(), feedService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
                .build();
    }

    @Test
    void listFeedsReturnsFeedsForActor() throws Exception {
        FeedVO feed = new FeedVO();
        feed.setFeedId(5L);
        feed.setTargetType("NOTICE");
        feed.setTargetId(21L);
        feed.setEventType("NOTICE_CREATED");
        when(feedService.listFeeds(eq(1L), eq("user-001"), eq(0), eq(20))).thenReturn(Collections.singletonList(feed));

        mockMvc.perform(get("/api/v1/feeds")
                .principal(authenticationFor())
                .param("page", "0")
                .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList[0].feedId").value(5))
                .andExpect(jsonPath("$.result.resultList[0].eventType").value("NOTICE_CREATED"));
    }

    @Test
    void createFeedRejectsMissingEventType() throws Exception {
        mockMvc.perform(post("/api/v1/feeds")
                .principal(authenticationFor())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"targetType\":\"NOTICE\",\"targetId\":21,\"message\":\"hello\"}"))
                .andExpect(status().isBadRequest());
    }

    private UsernamePasswordAuthenticationToken authenticationFor() {
        LoginVO user = new LoginVO();
        user.setTenantId(1L);
        user.setId("user-001");
        return new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList());
    }

    private static class AuthenticationPrincipalResolver implements HandlerMethodArgumentResolver {
        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
        }

        @Override
        public Object resolveArgument(
                MethodParameter parameter,
                ModelAndViewContainer modelAndViewContainer,
                NativeWebRequest webRequest,
                org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
            return ((UsernamePasswordAuthenticationToken) webRequest.getUserPrincipal()).getPrincipal();
        }
    }
}
