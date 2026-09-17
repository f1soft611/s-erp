package egovframework.com.common.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.repository.CommonFileDAO;
import egovframework.com.common.service.impl.CommonFileServiceImpl;

class CommonFileServiceTest {

    @Test
    void deleteFileIncludesOwnerWhenOwnerAwareContractIsUsed() throws Exception {
        Map<String, Object> captured = new HashMap<>();
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public void softDeleteCommonFileByOwner(Map<String, Object> params) {
                captured.putAll(params);
            }
        };

        new CommonFileServiceImpl(null, dao)
            .deleteFile(1L, "NOTICE_COMMENT", 42L, 8L);

        assertThat(captured)
            .containsEntry("tenantId", 1L)
            .containsEntry("fileId", 8L)
            .containsEntry("ownerType", "NOTICE_COMMENT")
            .containsEntry("ownerId", 42L);
    }

    @Test
    void downloadFileIncludesOwnerWhenOwnerAwareContractIsUsed() throws Exception {
        Map<String, Object> captured = new HashMap<>();
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public CommonFileVO selectCommonFileByIdAndOwner(Map<String, Object> params) {
                captured.putAll(params);
                return null;
            }
        };
        MockHttpServletResponse response = new MockHttpServletResponse();

        new CommonFileServiceImpl(null, dao)
            .downloadFile(1L, "NOTICE_COMMENT", 42L, 8L, response);

        assertThat(captured)
            .containsEntry("tenantId", 1L)
            .containsEntry("fileId", 8L)
            .containsEntry("ownerType", "NOTICE_COMMENT")
            .containsEntry("ownerId", 42L);
    }
}