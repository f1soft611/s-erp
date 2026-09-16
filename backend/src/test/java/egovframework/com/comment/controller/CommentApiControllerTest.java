package egovframework.com.comment.controller;

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
import egovframework.com.comment.domain.model.CommentVO;
import egovframework.com.comment.service.CommentService;
import egovframework.com.cmm.util.ResultVoHelper;

@ExtendWith(MockitoExtension.class)
class CommentApiControllerTest {

    @Mock
    private CommentService commentService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        CommentApiController controller = new CommentApiController(new ResultVoHelper(), commentService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
                .build();
    }

    @Test
    void listCommentsReturnsCommentsForTarget() throws Exception {
        CommentVO comment = new CommentVO();
        comment.setCommentId(7L);
        comment.setTargetType("NOTICE");
        comment.setTargetId(21L);
        comment.setContent("테스트 댓글");
        when(commentService.listComments(eq(1L), eq("NOTICE"), eq(21L))).thenReturn(Collections.singletonList(comment));

        mockMvc.perform(get("/api/v1/comments")
                .principal(authenticationFor())
                .param("targetType", "NOTICE")
                .param("targetId", "21"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList[0].commentId").value(7))
                .andExpect(jsonPath("$.result.resultList[0].targetType").value("NOTICE"));
    }

    @Test
    void createCommentRejectsBlankContent() throws Exception {
        mockMvc.perform(post("/api/v1/comments")
                .principal(authenticationFor())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"targetType\":\"NOTICE\",\"targetId\":21,\"content\":\"\"}"))
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
