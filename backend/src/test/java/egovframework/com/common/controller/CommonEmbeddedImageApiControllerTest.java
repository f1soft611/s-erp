package egovframework.com.common.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import egovframework.com.cmm.LoginVO;
import egovframework.com.common.service.EmbeddedImageStorageService;

class CommonEmbeddedImageApiControllerTest {

    @Test
    void streamsTheImageWithTheAuthenticatedTenantWithoutRedirecting() throws Exception {
        EmbeddedImageStorageService service = mock(EmbeddedImageStorageService.class);
        MockMvc mvc = mvc(service);
        LoginVO user = new LoginVO();
        user.setTenantId(9L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));
        doAnswer(invocation -> {
            javax.servlet.http.HttpServletResponse response = invocation.getArgument(3);
            response.setContentType("image/png");
            response.getOutputStream().write(new byte[] {1, 2, 3});
            return null;
        }).when(service).streamTemporaryImage(eq(9L), eq("image-token"), eq("pasted.png"), any());

        try {
            mvc.perform(get("/api/v1/common/embedded-images/temp/image-token")
                    .param("fileName", "pasted.png").param("tenantId", "10"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType("image/png"))
                    .andExpect(content().bytes(new byte[] {1, 2, 3}));
            verify(service).streamTemporaryImage(eq(9L), eq("image-token"), eq("pasted.png"), any());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void rejectsUnauthenticatedRequestsBeforeAccessingStorage() throws Exception {
        SecurityContextHolder.clearContext();
        EmbeddedImageStorageService service = mock(EmbeddedImageStorageService.class);
        mvc(service).perform(get("/api/v1/common/embedded-images/temp/image-token")
                .param("fileName", "pasted.png")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    private MockMvc mvc(EmbeddedImageStorageService service) {
        return MockMvcBuilders.standaloneSetup(new CommonEmbeddedImageApiController(service))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
    }
}
