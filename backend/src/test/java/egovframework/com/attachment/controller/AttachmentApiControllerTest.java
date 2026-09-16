package egovframework.com.attachment.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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

import egovframework.com.attachment.domain.model.AttachmentFileVO;
import egovframework.com.attachment.service.AttachmentService;
import egovframework.com.cmm.LoginVO;

@ExtendWith(MockitoExtension.class)
class AttachmentApiControllerTest {

    @Mock
    private AttachmentService attachmentService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AttachmentApiController controller = new AttachmentApiController(new egovframework.com.cmm.util.ResultVoHelper(), attachmentService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
                .build();
    }

    @Test
    void listAttachmentsReturnsAttachmentsForOwner() throws Exception {
        AttachmentFileVO attachment = new AttachmentFileVO();
        attachment.setAttachmentId(11L);
        attachment.setOwnerType("NOTICE");
        attachment.setOwnerId(21L);
        attachment.setFileName("report.pdf");
        when(attachmentService.listAttachments(eq(1L), eq("NOTICE"), eq(21L))).thenReturn(Collections.singletonList(attachment));

        mockMvc.perform(get("/api/v1/attachments")
                .principal(authenticationFor())
                .param("ownerType", "NOTICE")
                .param("ownerId", "21"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList[0].attachmentId").value(11))
                .andExpect(jsonPath("$.result.resultList[0].ownerType").value("NOTICE"));
    }

    @Test
    void uploadRejectsEmptyFile() throws Exception {
        mockMvc.perform(multipart("/api/v1/attachments/upload")
                .file("file", new byte[0])
                .param("ownerType", "NOTICE")
                .param("ownerId", "21")
                .param("uploaderId", "user-001")
                .principal(authenticationFor()))
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
