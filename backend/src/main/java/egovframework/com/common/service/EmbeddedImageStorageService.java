package egovframework.com.common.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

import javax.servlet.http.HttpServletResponse;

import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;

public interface EmbeddedImageStorageService {

    EmbeddedImageUploadVO uploadTemporaryImage(Long tenantId, MultipartFile file) throws Exception;

    CommonFileVO promoteTemporaryImage(
            Long tenantId,
            String ownerType,
            Long ownerId,
            String uploadToken,
            String fileName,
            String uploadedBy) throws Exception;

            void deleteTemporaryImage(Long tenantId, String uploadToken, String fileName) throws Exception;

            List<CommonFileVO> listOwnedImages(Long tenantId, String ownerType, Long ownerId) throws Exception;

            void completeOwnerSave(
                Long tenantId,
                String ownerType,
                Long ownerId,
                List<EmbeddedImageUploadVO> sessionUploads,
                Set<Long> retainedFileIds) throws Exception;

            void streamOwnedImage(
                Long tenantId,
                String ownerType,
                Long ownerId,
                Long fileId,
                HttpServletResponse response) throws Exception;
}