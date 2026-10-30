package egovframework.com.common.controller;

import javax.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.common.service.EmbeddedImageStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api/v1/common/embedded-images")
public class CommonEmbeddedImageApiController {

    private final EmbeddedImageStorageService imageStorageService;

    public CommonEmbeddedImageApiController(EmbeddedImageStorageService imageStorageService) {
        this.imageStorageService = imageStorageService;
    }

    @Operation(summary = "본문 임시 이미지 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/temp/{uploadToken}")
    public void streamTemporaryImage(@PathVariable String uploadToken, @RequestParam String fileName,
            @AuthenticationPrincipal LoginVO user, HttpServletResponse response) throws Exception {
        if (user == null || user.getTenantId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ResponseCode.AUTH_ERROR.getMessage());
        }
        imageStorageService.streamTemporaryImage(user.getTenantId(), uploadToken, fileName, response);
    }
}
