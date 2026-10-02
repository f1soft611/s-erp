package egovframework.let.co.workflow.form.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import egovframework.com.cmm.service.MinioStorageService;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.repository.CommonFileDAO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateEmbeddedImageVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateUploadVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkVO;
import egovframework.let.co.workflow.form.domain.repository.DraftingWorkDAO;
import io.minio.StatObjectResponse;

class DraftingWorkTemplateImageServiceImplTest {

    @Test
    void uploadsPngToDraftingWorkTemporaryPrefixAfterTenantScopedFormCheck() throws Exception {
        DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
        MinioStorageService storage = mock(MinioStorageService.class);
        when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
        DraftingWorkTemplateImageServiceImpl service = service(draftingWorkDAO, storage, 1024L);
        MockMultipartFile file = png("../pasted.png");

        DraftingWorkTemplateUploadVO result = service.uploadTemporaryImage(9L, 77L, file);

        assertTrue(result.getUploadToken().matches(
                "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"));
        assertEquals("pasted.png", result.getFileName());
        assertEquals(8L, result.getFileSize());
        assertEquals("image/png", result.getMimeType());
        verify(draftingWorkDAO).selectWorkById(9L, 77L);
        verify(storage).uploadTagged(eq("document-attachments"), argThat(key ->
                key.startsWith("tenant/9/drafting-work-form-temp/77/")
                        && key.endsWith("/pasted.png")), any(InputStream.class), eq(8L), eq("image/png"),
                eq(Collections.singletonMap("s-erp-temp-owner", "drafting-work-form")));
    }

    @Test
    void rejectsUploadWhenFormDoesNotBelongToTenant() throws Exception {
        DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
        MinioStorageService storage = mock(MinioStorageService.class);
        when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(null);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service(draftingWorkDAO, storage, 1024L)
                        .uploadTemporaryImage(9L, 77L, png("pasted.png")));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
        verify(storage, never()).uploadTagged(any(), any(), any(), eq(8L), any(), any());
    }

    @Test
    void rejectsUnsupportedMimeAndInvalidImageSignature() throws Exception {
        DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
        MinioStorageService storage = mock(MinioStorageService.class);
        when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
        DraftingWorkTemplateImageServiceImpl service = service(draftingWorkDAO, storage, 1024L);
        MockMultipartFile fakePng = new MockMultipartFile(
                "file", "fake.png", "image/png", "not a png".getBytes("UTF-8"));
        MockMultipartFile svg = new MockMultipartFile(
                "file", "image.svg", "image/svg+xml", "<svg/>".getBytes("UTF-8"));
        MockMultipartFile shortJpeg = image("short.jpg", "image/jpeg",
                new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff});

        ResponseStatusException invalidSignature = assertThrows(ResponseStatusException.class,
                () -> service.uploadTemporaryImage(9L, 77L, fakePng));
        ResponseStatusException unsupportedMime = assertThrows(ResponseStatusException.class,
                () -> service.uploadTemporaryImage(9L, 77L, svg));
        ResponseStatusException invalidJpeg = assertThrows(ResponseStatusException.class,
                () -> service.uploadTemporaryImage(9L, 77L, shortJpeg));

        assertEquals(HttpStatus.BAD_REQUEST, invalidSignature.getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, unsupportedMime.getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, invalidJpeg.getStatus());
        verify(storage, never()).uploadTagged(any(), any(), any(), any(Long.class), any(), any());
    }

    @Test
    void rejectsOversizedImageBeforeStorageWrite() throws Exception {
        DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
        MinioStorageService storage = mock(MinioStorageService.class);
        when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service(draftingWorkDAO, storage, 7L)
                        .uploadTemporaryImage(9L, 77L, png("pasted.png")));

        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, exception.getStatus());
        verify(storage, never()).uploadTagged(any(), any(), any(), any(Long.class), any(), any());
    }

    @Test
    void uploadsJpegGifAndWebpWhenMimeAndSignatureMatch() throws Exception {
        DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
        MinioStorageService storage = mock(MinioStorageService.class);
        when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
        DraftingWorkTemplateImageServiceImpl service = service(draftingWorkDAO, storage, 1024L);

        service.uploadTemporaryImage(9L, 77L, image("photo.jpg", "image/jpeg",
                new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0}));
        service.uploadTemporaryImage(9L, 77L, image("animation.gif", "image/gif",
                new byte[] {'G', 'I', 'F', '8', '9', 'a'}));
        service.uploadTemporaryImage(9L, 77L, image("image.webp", "image/webp",
                new byte[] {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'}));

        verify(storage, times(3)).uploadTagged(eq("document-attachments"), any(String.class),
                any(InputStream.class), any(Long.class), any(String.class), any());
    }

    @Test
    void rejectsNullOrEmptyFileBeforeStorageWrite() throws Exception {
        DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
        MinioStorageService storage = mock(MinioStorageService.class);
        when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
        DraftingWorkTemplateImageServiceImpl service = service(draftingWorkDAO, storage, 1024L);

        ResponseStatusException nullFile = assertThrows(ResponseStatusException.class,
                () -> service.uploadTemporaryImage(9L, 77L, null));
        ResponseStatusException emptyFile = assertThrows(ResponseStatusException.class,
                () -> service.uploadTemporaryImage(9L, 77L,
                        new MockMultipartFile("file", "empty.png", "image/png", new byte[0])));

        assertEquals(HttpStatus.BAD_REQUEST, nullFile.getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, emptyFile.getStatus());
        verify(storage, never()).uploadTagged(any(), any(), any(), any(Long.class), any(), any());
    }

    @Test
        void rejectsMissingTenantBeforeQueryingFormOrStorage() throws Exception {
        DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
        MinioStorageService storage = mock(MinioStorageService.class);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service(draftingWorkDAO, storage, 1024L)
                        .uploadTemporaryImage(null, 77L, png("pasted.png")));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        verify(draftingWorkDAO, never()).selectWorkById(any(), any());
        verify(storage, never()).uploadTagged(any(), any(), any(), any(Long.class), any(), any());
    }

    @Test
    void deletesOnlyTheTokenScopedTemporaryObjectForTheTenantAndForm() throws Exception {
        DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
        MinioStorageService storage = mock(MinioStorageService.class);
        when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
        DraftingWorkTemplateImageServiceImpl service = service(draftingWorkDAO, storage, 1024L);

        service.deleteTemporaryImage(9L, 77L,
                "bde1fdec-5d22-487a-a254-2b9547cd32b3", "../pasted.png");

        verify(storage).delete(eq("document-attachments"), eq(
                "tenant/9/drafting-work-form-temp/77/bde1fdec-5d22-487a-a254-2b9547cd32b3/pasted.png"));
    }

    @Test
    void promotesImageUsingServerMetadataAndRegistersTemplateOwnership() throws Exception {
        DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
        CommonFileDAO commonFileDAO = mock(CommonFileDAO.class);
        MinioStorageService storage = mock(MinioStorageService.class);
        when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
        StatObjectResponse stat = mock(StatObjectResponse.class);
        when(stat.size()).thenReturn(8L);
        when(stat.contentType()).thenReturn("image/png");
        when(storage.stat(eq("document-attachments"),
                eq("tenant/9/drafting-work-form-temp/77/bde1fdec-5d22-487a-a254-2b9547cd32b3/pasted.png")))
                .thenReturn(stat);
        when(commonFileDAO.insertCommonFile(org.mockito.ArgumentMatchers.anyMap())).thenReturn(901L);
        CommonFileVO savedFile = new CommonFileVO();
        savedFile.setFileId(901L);
        savedFile.setTenantId(9L);
        savedFile.setOwnerType("DRAFTING_WORK_TEMPLATE");
        savedFile.setOwnerId(77L);
        savedFile.setFileUsageType("EMBEDDED");
        savedFile.setObjectKey("tenant/9/drafting-work-form/77/bde1fdec-5d22-487a-a254-2b9547cd32b3/pasted.png");
        CommonFileVO result = new DraftingWorkTemplateImageServiceImpl(
                draftingWorkDAO, commonFileDAO, storage, "document-attachments", 1024L)
                .promoteTemporaryImage(9L, 77L,
                        "bde1fdec-5d22-487a-a254-2b9547cd32b3", "pasted.png", "login-9");

        assertEquals(901L, result.getFileId());
        verify(storage).copyWithoutTags("document-attachments",
                "tenant/9/drafting-work-form-temp/77/bde1fdec-5d22-487a-a254-2b9547cd32b3/pasted.png",
                "tenant/9/drafting-work-form/77/bde1fdec-5d22-487a-a254-2b9547cd32b3/pasted.png");
        org.mockito.ArgumentCaptor<Map<String, Object>> params =
                org.mockito.ArgumentCaptor.forClass(Map.class);
        verify(commonFileDAO).insertCommonFile(params.capture());
        assertEquals("DRAFTING_WORK_TEMPLATE", params.getValue().get("ownerType"));
        assertEquals(77L, params.getValue().get("ownerId"));
        assertEquals("EMBEDDED", params.getValue().get("fileUsageType"));
        assertEquals(8L, params.getValue().get("fileSize"));
        assertEquals("image/png", params.getValue().get("mimeType"));
        assertEquals("login-9", params.getValue().get("uploadedBy"));
    }

    @Test
    void streamsOwnedEmbeddedImageInlineWithSafeHeaders() throws Exception {
        DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
        CommonFileDAO commonFileDAO = mock(CommonFileDAO.class);
        MinioStorageService storage = mock(MinioStorageService.class);
        when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
        CommonFileVO file = embeddedFile(901L,
                "tenant/9/drafting-work-form/77/bde1fdec-5d22-487a-a254-2b9547cd32b3/pasted.png");
        when(commonFileDAO.selectCommonFileByIdAndOwner(org.mockito.ArgumentMatchers.anyMap())).thenReturn(file);
        byte[] imageBytes = new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10};
        when(storage.download("document-attachments", file.getObjectKey()))
                .thenReturn(new java.io.ByteArrayInputStream(imageBytes));
        DraftingWorkTemplateImageServiceImpl service = new DraftingWorkTemplateImageServiceImpl(
                draftingWorkDAO, commonFileDAO, storage, "document-attachments", 1024L);
        MockHttpServletResponse response = new MockHttpServletResponse();

        service.streamTemplateImage(9L, 77L, 901L, response);

        assertEquals("image/png", response.getContentType());
        assertEquals("private, max-age=300", response.getHeader("Cache-Control"));
        assertEquals("nosniff", response.getHeader("X-Content-Type-Options"));
        assertEquals("inline", response.getHeader("Content-Disposition"));
        assertArrayEquals(imageBytes, response.getContentAsByteArray());
    }

    @Test
    void refusesAttachmentOrUnexpectedObjectKeyOnImageStream() throws Exception {
        DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
        CommonFileDAO commonFileDAO = mock(CommonFileDAO.class);
        MinioStorageService storage = mock(MinioStorageService.class);
        when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
        CommonFileVO file = embeddedFile(901L, "tenant/9/notice/77/image.png");
        file.setFileUsageType("ATTACHMENT");
        when(commonFileDAO.selectCommonFileByIdAndOwner(org.mockito.ArgumentMatchers.anyMap())).thenReturn(file);
        DraftingWorkTemplateImageServiceImpl service = new DraftingWorkTemplateImageServiceImpl(
                draftingWorkDAO, commonFileDAO, storage, "document-attachments", 1024L);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.streamTemplateImage(9L, 77L, 901L, new MockHttpServletResponse()));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
        verify(storage, never()).download(any(), any());
    }

        @Test
        void completeTemplateSaveSoftDeletesUnusedFileAndCleansObjectsAfterCommit() throws Exception {
                DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
                CommonFileDAO commonFileDAO = mock(CommonFileDAO.class);
                MinioStorageService storage = mock(MinioStorageService.class);
                when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
                CommonFileVO unusedFile = embeddedFile(901L,
                                "tenant/9/drafting-work-form/77/bde1fdec-5d22-487a-a254-2b9547cd32b3/pasted.png");
                when(commonFileDAO.selectCommonFileList(org.mockito.ArgumentMatchers.anyMap()))
                                .thenReturn(Collections.singletonList(unusedFile));
                DraftingWorkTemplateEmbeddedImageVO temporaryImage = new DraftingWorkTemplateEmbeddedImageVO();
                temporaryImage.setUploadToken("bde1fdec-5d22-487a-a254-2b9547cd32b3");
                temporaryImage.setFileName("temporary.png");
                DraftingWorkTemplateImageServiceImpl service = new DraftingWorkTemplateImageServiceImpl(
                                draftingWorkDAO, commonFileDAO, storage, "document-attachments", 1024L);

                TransactionSynchronizationManager.initSynchronization();
                try {
                        service.completeTemplateSave(9L, 77L, Collections.singletonList(temporaryImage),
                                        Collections.<Long>emptySet());

                        verify(commonFileDAO).softDeleteCommonFileByOwner(org.mockito.ArgumentMatchers.argThat(params ->
                                        Long.valueOf(9L).equals(params.get("tenantId"))
                                                        && "DRAFTING_WORK_TEMPLATE".equals(params.get("ownerType"))
                                                        && Long.valueOf(77L).equals(params.get("ownerId"))
                                                        && Long.valueOf(901L).equals(params.get("fileId"))));
                        verify(storage, never()).delete(any(), any());
                        for (TransactionSynchronization synchronization : TransactionSynchronizationManager.getSynchronizations()) {
                                synchronization.afterCommit();
                        }
                        verify(storage).delete("document-attachments", unusedFile.getObjectKey());
                        verify(storage).delete("document-attachments",
                                        "tenant/9/drafting-work-form-temp/77/bde1fdec-5d22-487a-a254-2b9547cd32b3/temporary.png");
                } finally {
                        TransactionSynchronizationManager.clearSynchronization();
                }
        }

        @Test
        void promotionDeletesPermanentCopyWhenDatabaseTransactionRollsBack() throws Exception {
                DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
                CommonFileDAO commonFileDAO = mock(CommonFileDAO.class);
                MinioStorageService storage = mock(MinioStorageService.class);
                when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
                StatObjectResponse stat = mock(StatObjectResponse.class);
                when(stat.size()).thenReturn(8L);
                when(stat.contentType()).thenReturn("image/png");
                when(storage.stat(eq("document-attachments"), any(String.class))).thenReturn(stat);
                when(commonFileDAO.insertCommonFile(org.mockito.ArgumentMatchers.anyMap())).thenReturn(902L);
                DraftingWorkTemplateImageServiceImpl service = new DraftingWorkTemplateImageServiceImpl(
                                draftingWorkDAO, commonFileDAO, storage, "document-attachments", 1024L);

                TransactionSynchronizationManager.initSynchronization();
                try {
                        service.promoteTemporaryImage(9L, 77L,
                                        "bde1fdec-5d22-487a-a254-2b9547cd32b3", "rollback.png", "login-9");

                        for (TransactionSynchronization synchronization : TransactionSynchronizationManager.getSynchronizations()) {
                                synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
                        }

                        verify(storage).delete("document-attachments",
                                        "tenant/9/drafting-work-form/77/bde1fdec-5d22-487a-a254-2b9547cd32b3/rollback.png");
                } finally {
                        TransactionSynchronizationManager.clearSynchronization();
                }
        }

    @Test
    void rejectsInvalidUploadTokenBeforeDeletingAnObject() throws Exception {
        DraftingWorkDAO draftingWorkDAO = mock(DraftingWorkDAO.class);
        MinioStorageService storage = mock(MinioStorageService.class);
        when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service(draftingWorkDAO, storage, 1024L)
                        .deleteTemporaryImage(9L, 77L, "../other", "pasted.png"));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(storage, never()).delete(any(), any());
    }

    private DraftingWorkTemplateImageServiceImpl service(
            DraftingWorkDAO draftingWorkDAO,
            MinioStorageService storage,
            long maxFileSize) {
        return new DraftingWorkTemplateImageServiceImpl(
                draftingWorkDAO, mock(CommonFileDAO.class), storage, "document-attachments", maxFileSize);
    }

    private MockMultipartFile png(String fileName) {
        return new MockMultipartFile("file", fileName, "image/png",
                new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10});
    }

        private MockMultipartFile image(String fileName, String mimeType, byte[] bytes) {
                return new MockMultipartFile("file", fileName, mimeType, bytes);
        }

        private CommonFileVO embeddedFile(Long fileId, String objectKey) {
                CommonFileVO file = new CommonFileVO();
                file.setFileId(fileId);
                file.setTenantId(9L);
                file.setOwnerType("DRAFTING_WORK_TEMPLATE");
                file.setOwnerId(77L);
                file.setObjectKey(objectKey);
                file.setBucketName("document-attachments");
                file.setFileName("pasted.png");
                file.setFileSize(8L);
                file.setMimeType("image/png");
                file.setFileUsageType("EMBEDDED");
                file.setDeletedYn("N");
                return file;
        }
}