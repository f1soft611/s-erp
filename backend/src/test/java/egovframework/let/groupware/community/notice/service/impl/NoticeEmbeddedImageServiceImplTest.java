package egovframework.let.groupware.community.notice.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.service.MinioStorageService;
import egovframework.let.groupware.community.notice.domain.model.NoticeEmbeddedImageVO;

class NoticeEmbeddedImageServiceImplTest {

    @Test
    void uploadsPngAndReturnsPublicImageUrl() throws Exception {
        MinioStorageService storage = mock(MinioStorageService.class);
        NoticeEmbeddedImageServiceImpl service = new NoticeEmbeddedImageServiceImpl(
            storage,
            "document-attachments",
            "https://cdn.example.com",
            1024 * 1024L);
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "pasted.png",
            "image/png",
            new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10});

        NoticeEmbeddedImageVO result = service.uploadTemporaryImage(7L, "user-1", file);

        assertThat(result.getImageUrl()).startsWith("https://cdn.example.com/document-attachments/");
        assertThat(result.getMimeType()).isEqualTo("image/png");
        assertThat(result.getUploadToken()).isNotBlank();
        verify(storage).upload(
            org.mockito.ArgumentMatchers.eq("document-attachments"),
            org.mockito.ArgumentMatchers.contains("notice-temp"),
            any(),
            org.mockito.ArgumentMatchers.eq(8L),
            org.mockito.ArgumentMatchers.eq("image/png"));
    }

    @Test
    void rejectsFileWithImageMimeButInvalidSignature() {
        NoticeEmbeddedImageServiceImpl service = new NoticeEmbeddedImageServiceImpl(
            mock(MinioStorageService.class),
            "document-attachments",
            "https://cdn.example.com",
            1024 * 1024L);
        MockMultipartFile file = new MockMultipartFile(
            "file", "pasted.png", "image/png", "not-an-image".getBytes());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
            () -> service.uploadTemporaryImage(7L, "user-1", file));

        assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
