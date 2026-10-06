package egovframework.let.groupware.community.notice.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Arrays;
import java.util.Collections;
import java.util.Map;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.mock.web.MockHttpServletResponse;

import egovframework.com.common.domain.model.CommonCommentPageVO;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.service.EmbeddedImageStorageService;
import egovframework.com.common.service.CommonCommentService;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardFileVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeEmbeddedImageVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostSaveRequestVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostSearchVO;
import egovframework.let.groupware.community.notice.domain.repository.NoticeBoardDAO;
import egovframework.let.common.dto.ListResult;

class NoticeBoardServiceImplTest {

    @Test
    void createPostPromotesEmbeddedImageAndPersistsStableHtmlAndJsonSources() throws Exception {
    NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
    CommonFileService commonFileService = mock(CommonFileService.class);
    CommonCommentService commonCommentService = mock(CommonCommentService.class);
    EmbeddedImageStorageService imageStorageService = mock(EmbeddedImageStorageService.class);
    String uploadToken = "bde1fdec-5d22-487a-a254-2b9547cd32b3";
    String temporaryKey = "tenant/1/embedded-image-temp/" + uploadToken + "/pasted.png";
    String permanentKey = "tenant/1/embedded-images/notice/42/" + uploadToken + "/pasted.png";
    String stableUrl = "/api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey=tenant%2F1%2Fembedded-images%2Fnotice%2F42%2F"
        + uploadToken + "%2Fpasted.png";
    CommonFileVO promoted = new CommonFileVO();
    promoted.setFileId(113L);
    promoted.setTenantId(1L);
    promoted.setOwnerType("NOTICE");
    promoted.setOwnerId(42L);
    promoted.setFileUsageType("EMBEDDED");
    promoted.setDeletedYn("N");
    promoted.setObjectKey(permanentKey);
    promoted.setBucketName("document-attachments");
    promoted.setFileName("pasted.png");
    promoted.setMimeType("image/png");
    NoticeEmbeddedImageVO temporary = new NoticeEmbeddedImageVO();
    temporary.setUploadToken(uploadToken);
    temporary.setFileName("pasted.png");
    when(noticeBoardDAO.insertNoticePost(org.mockito.ArgumentMatchers.anyMap())).thenReturn(42L);
    NoticeBoardPostVO savedPost = new NoticeBoardPostVO();
    savedPost.setPostId(42L);
    savedPost.setContentsHtml("<p><img src=\"" + stableUrl
        + "\" data-file-id=\"113\" data-object-key=\"" + permanentKey + "\"></p>");
    when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap())).thenReturn(savedPost);
    when(imageStorageService.promoteTemporaryImage(
        1L, "NOTICE", 42L, uploadToken, "pasted.png", "login-user")).thenReturn(promoted);
    when(imageStorageService.listOwnedImages(1L, "NOTICE", 42L))
        .thenReturn(Collections.singletonList(promoted));
    when(commonFileService.listFiles(1L, "NOTICE", 42L)).thenReturn(Collections.singletonList(promoted));
    CommonCommentPageVO commentPage = new CommonCommentPageVO();
    commentPage.setComments(Collections.emptyList());
    when(commonCommentService.listComments(1L, "NOTICE", 42L, 3, null)).thenReturn(commentPage);
    when(commonCommentService.countComments(1L, "NOTICE", 42L)).thenReturn(0L);

    NoticeBoardPostSaveRequestVO payload = new NoticeBoardPostSaveRequestVO();
    payload.setTitle("이미지 공지");
    payload.setNoticeGubunCode("GENERAL");
    payload.setWriterId("untrusted-payload-user");
    payload.setContentsHtml("<p><img src=\"https://minio.example/presigned\" data-upload-token=\""
        + uploadToken + "\" data-object-key=\"" + temporaryKey + "\" alt=\"pasted.png\"></p>");
    payload.setContentsJson("{\"type\":\"doc\",\"content\":[{\"type\":\"image\",\"attrs\":{"
        + "\"src\":\"https://minio.example/presigned\",\"data-upload-token\":\""
        + uploadToken + "\",\"data-object-key\":\"" + temporaryKey + "\",\"alt\":\"pasted.png\"}}]}");
    payload.setEmbeddedImages(Collections.singletonList(temporary));

    new NoticeBoardServiceImpl(noticeBoardDAO, commonFileService, commonCommentService, imageStorageService)
        .createPost(1L, payload, "login-user", "로그인 사용자");

    org.mockito.ArgumentCaptor<Map<String, Object>> params = org.mockito.ArgumentCaptor.forClass(Map.class);
    verify(noticeBoardDAO).updateNoticePost(params.capture());
    assertThat(params.getValue().get("contentsHtml").toString()).contains(stableUrl)
        .contains("data-file-id=\"113\"").doesNotContain("presigned", "data-upload-token");
    assertThat(params.getValue().get("contentsJson").toString()).contains(stableUrl)
        .contains("data-file-id").doesNotContain("presigned", "data-upload-token");
    verify(imageStorageService).promoteTemporaryImage(
        1L, "NOTICE", 42L, uploadToken, "pasted.png", "login-user");
    verify(imageStorageService).completeOwnerSave(eq(1L), eq("NOTICE"), eq(42L),
        org.mockito.ArgumentMatchers.argThat((List<EmbeddedImageUploadVO> uploads) ->
            uploads.size() == 1 && uploadToken.equals(uploads.get(0).getUploadToken())
                && "pasted.png".equals(uploads.get(0).getFileName())),
        eq(Collections.singleton(113L)));
    }

    @Test
    void updatePostRetainsOwnedLegacyImageAndRewritesBothBodyFormats() throws Exception {
    NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
    CommonFileService commonFileService = mock(CommonFileService.class);
    CommonCommentService commonCommentService = mock(CommonCommentService.class);
    EmbeddedImageStorageService imageStorageService = mock(EmbeddedImageStorageService.class);
    String legacyKey = "tenant/1/notice-temp/old-token/pasted.png";
    String stableUrl = "/api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey="
        + "tenant%2F1%2Fnotice-temp%2Fold-token%2Fpasted.png";
    CommonFileVO owned = new CommonFileVO();
    owned.setFileId(113L);
    owned.setTenantId(1L);
    owned.setOwnerType("NOTICE");
    owned.setOwnerId(42L);
    owned.setFileUsageType("EMBEDDED");
    owned.setDeletedYn("N");
    owned.setObjectKey(legacyKey);
    owned.setBucketName("document-attachments");
    when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap()))
        .thenReturn(new NoticeBoardPostVO());
    when(imageStorageService.listOwnedImages(1L, "NOTICE", 42L))
        .thenReturn(Collections.singletonList(owned));
    when(commonFileService.listFiles(1L, "NOTICE", 42L)).thenReturn(Collections.singletonList(owned));
    CommonCommentPageVO commentPage = new CommonCommentPageVO();
    commentPage.setComments(Collections.emptyList());
    when(commonCommentService.listComments(1L, "NOTICE", 42L, 3, null)).thenReturn(commentPage);
    when(commonCommentService.countComments(1L, "NOTICE", 42L)).thenReturn(0L);
    NoticeBoardPostSaveRequestVO payload = new NoticeBoardPostSaveRequestVO();
    payload.setTitle("수정 공지");
    payload.setNoticeGubunCode("GENERAL");
    payload.setContentsHtml("<p><img src=\"blob:http://localhost/preview\" data-file-id=\"113\" "
        + "data-object-key=\"" + legacyKey + "\" alt=\"pasted.png\"></p>");
    payload.setContentsJson("{\"type\":\"doc\",\"content\":[{\"type\":\"image\",\"attrs\":{"
        + "\"src\":\"blob:http://localhost/preview\",\"data-file-id\":\"113\","
        + "\"data-object-key\":\"" + legacyKey + "\",\"alt\":\"pasted.png\"}}]}");

    new NoticeBoardServiceImpl(noticeBoardDAO, commonFileService, commonCommentService, imageStorageService)
        .updatePost(1L, 42L, payload, "login-user", "로그인 사용자");

    ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
    verify(noticeBoardDAO).updateNoticePost(params.capture());
    assertThat(params.getValue().get("contentsHtml").toString()).contains(stableUrl);
    assertThat(params.getValue().get("contentsJson").toString()).contains(stableUrl);
    verify(imageStorageService, org.mockito.Mockito.never())
        .promoteTemporaryImage(org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.anyString());
    verify(imageStorageService).completeOwnerSave(eq(1L), eq("NOTICE"), eq(42L),
        eq(Collections.emptyList()), eq(Collections.singleton(113L)));
    }

    @Test
    void updatesPinnedStateWithoutReplacingRequiredPostFields() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        NoticeBoardPostVO existingPost = new NoticeBoardPostVO();
        existingPost.setPostId(77L);
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(existingPost);

        new NoticeBoardServiceImpl(noticeBoardDAO, commonFileService, commonCommentService)
            .updatePinned(1L, 77L, "Y", "admin", "관리자");

        ArgumentCaptor<Map<String, Object>> paramsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(noticeBoardDAO).updateNoticePostPinned(paramsCaptor.capture());
        assertThat(paramsCaptor.getValue())
            .containsEntry("tenantId", 1L)
            .containsEntry("postId", 77L)
            .containsEntry("isPinned", "Y")
            .containsEntry("lastModifiedBy", "admin")
            .containsEntry("lastModifiedByName", "관리자");
    }

    @Test
    void listPostsUsesPaginationInfoAndReturnsTotalCount() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        when(noticeBoardDAO.selectNoticePostList(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(Collections.emptyList());
        when(noticeBoardDAO.selectNoticePostCount(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(41L);

        NoticeBoardPostSearchVO search = new NoticeBoardPostSearchVO();
        search.setTenantId(1L);
        search.setPageIndex(3);
        search.setPageUnit(20);
        search.setKeyword(" announcement ");
        search.setIsPinned("Y");

        ListResult<NoticeBoardPostVO> result = new NoticeBoardServiceImpl(
            noticeBoardDAO, commonFileService, commonCommentService)
            .listPosts(search);

        assertThat(result.getResultList()).isEmpty();
        assertThat(result.getResultCnt()).isEqualTo(41L);
        assertThat(search.getFirstIndex()).isEqualTo(40);
        assertThat(search.getRecordCountPerPage()).isEqualTo(20);

        ArgumentCaptor<Map<String, Object>> paramsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(noticeBoardDAO).selectNoticePostList(paramsCaptor.capture());
        assertThat(paramsCaptor.getValue())
            .containsEntry("tenantId", 1L)
            .containsEntry("isPinned", "Y")
            .containsEntry("firstIndex", 40)
            .containsEntry("recordCountPerPage", 20);
    }

    @Test
    void listPostsPassesPinnedFilterToDao() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        CommonCommentPageVO commentPage = new CommonCommentPageVO();
        commentPage.setComments(Collections.emptyList());
        when(noticeBoardDAO.selectNoticePostList(org.mockito.ArgumentMatchers.anyMap()))
            .thenAnswer(invocation -> {
                Map<String, Object> params = invocation.getArgument(0);
                assertThat(params.get("isPinned")).isEqualTo("Y");
                return Collections.emptyList();
            });

        new NoticeBoardServiceImpl(noticeBoardDAO, commonFileService, commonCommentService)
            .listPosts(1L, "", 1, 20, null, "Y");
    }

    @Test
    void getPostIncrementsViewCountOnlyForFirstViewByUser() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        NoticeBoardPostVO post = new NoticeBoardPostVO();
        post.setPostId(7L);
        post.setViewCount(1);
        CommonCommentPageVO commentPage = new CommonCommentPageVO();
        commentPage.setComments(Collections.emptyList());
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(post);
        when(noticeBoardDAO.selectLoginIdByLoginCode(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(11L);
        when(noticeBoardDAO.insertNoticePostViewHistory(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(1L);
        when(commonFileService.listFiles(1L, "NOTICE", 7L)).thenReturn(Collections.emptyList());
        when(commonCommentService.listComments(1L, "NOTICE", 7L, 3, null)).thenReturn(commentPage);
        when(commonCommentService.countComments(1L, "NOTICE", 7L)).thenReturn(0L);

        NoticeBoardPostVO result = new NoticeBoardServiceImpl(
            noticeBoardDAO, commonFileService, commonCommentService)
            .getPost(1L, 7L, "user-a");

        assertThat(result.getViewCount()).isEqualTo(1);
        verify(noticeBoardDAO).incrementNoticePostViewCount(org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void getPostDoesNotIncrementViewCountForRepeatedViewByUser() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        NoticeBoardPostVO post = new NoticeBoardPostVO();
        post.setPostId(7L);
        post.setViewCount(2);
        CommonCommentPageVO commentPage = new CommonCommentPageVO();
        commentPage.setComments(Collections.emptyList());
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(post);
        when(noticeBoardDAO.selectLoginIdByLoginCode(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(11L);
        when(noticeBoardDAO.insertNoticePostViewHistory(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(null);
        when(commonFileService.listFiles(1L, "NOTICE", 7L)).thenReturn(Collections.emptyList());
        when(commonCommentService.listComments(1L, "NOTICE", 7L, 3, null)).thenReturn(commentPage);
        when(commonCommentService.countComments(1L, "NOTICE", 7L)).thenReturn(0L);

        new NoticeBoardServiceImpl(noticeBoardDAO, commonFileService, commonCommentService)
            .getPost(1L, 7L, "user-a");

        verify(noticeBoardDAO, org.mockito.Mockito.never())
            .incrementNoticePostViewCount(org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void getPostUsesLoginAccountAsTheViewHistoryIdentity() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        NoticeBoardPostVO post = new NoticeBoardPostVO();
        post.setPostId(7L);
        CommonCommentPageVO commentPage = new CommonCommentPageVO();
        commentPage.setComments(Collections.emptyList());
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(post);
        when(noticeBoardDAO.selectLoginIdByLoginCode(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(12L);
        when(noticeBoardDAO.insertNoticePostViewHistory(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(12L);
        when(commonFileService.listFiles(1L, "NOTICE", 7L)).thenReturn(Collections.emptyList());
        when(commonCommentService.listComments(1L, "NOTICE", 7L, 3, null)).thenReturn(commentPage);
        when(commonCommentService.countComments(1L, "NOTICE", 7L)).thenReturn(0L);

        new NoticeBoardServiceImpl(noticeBoardDAO, commonFileService, commonCommentService)
            .getPost(1L, 7L, "user-b");

        ArgumentCaptor<Map<String, Object>> viewParamsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(noticeBoardDAO).insertNoticePostViewHistory(viewParamsCaptor.capture());
        assertThat(viewParamsCaptor.getValue())
            .containsEntry("tenantId", 1L)
            .containsEntry("postId", 7L)
            .containsEntry("loginId", 12L);
        verify(noticeBoardDAO).incrementNoticePostViewCount(org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void getPostDoesNotCreateViewHistoryWhenNoticeDoesNotExist() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap())).thenReturn(null);

        assertThrows(ResponseStatusException.class, () -> new NoticeBoardServiceImpl(
            noticeBoardDAO, commonFileService, commonCommentService)
            .getPost(1L, 999L, "user-a"));

        verify(noticeBoardDAO, org.mockito.Mockito.never())
            .insertNoticePostViewHistory(org.mockito.ArgumentMatchers.anyMap());
        verify(noticeBoardDAO, org.mockito.Mockito.never())
            .incrementNoticePostViewCount(org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void createPostUsesAuthenticatedActorInsteadOfPayloadWriter() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        NoticeBoardPostVO persisted = new NoticeBoardPostVO();
        persisted.setPostId(42L);
        CommonCommentPageVO commentPage = new CommonCommentPageVO();
        commentPage.setComments(Collections.emptyList());
        when(noticeBoardDAO.insertNoticePost(org.mockito.ArgumentMatchers.anyMap())).thenReturn(42L);
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap())).thenReturn(persisted);
        when(commonFileService.listFiles(1L, "NOTICE", 42L)).thenReturn(Collections.emptyList());
        when(commonCommentService.listComments(1L, "NOTICE", 42L, 3, null)).thenReturn(commentPage);
        when(commonCommentService.countComments(1L, "NOTICE", 42L)).thenReturn(0L);

        NoticeBoardPostSaveRequestVO payload = new NoticeBoardPostSaveRequestVO();
        payload.setTitle("공지");
        payload.setContentsHtml("<p>본문</p>");
        payload.setContentsJson("{\"type\":\"doc\",\"content\":[]}");
        payload.setWriterId("payload-writer");
        payload.setWriterName("Payload Writer");
        payload.setNoticeGubunCode("GENERAL");

        new NoticeBoardServiceImpl(noticeBoardDAO, commonFileService, commonCommentService)
            .createPost(1L, payload, "login-user", "로그인 사용자");

        ArgumentCaptor<Map<String, Object>> paramsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(noticeBoardDAO).insertNoticePost(paramsCaptor.capture());
        assertThat(paramsCaptor.getValue()).containsEntry("writerId", "login-user");
        assertThat(paramsCaptor.getValue()).containsEntry("writerName", "로그인 사용자");
        assertThat(paramsCaptor.getValue()).containsEntry("noticeGubunCode", "GENERAL");
    }

    @Test
    void rejectsEmbeddedImageSaveWhenCommonStorageServiceIsUnavailable() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        NoticeBoardPostSaveRequestVO payload = new NoticeBoardPostSaveRequestVO();
        payload.setTitle("공지 이미지");
        payload.setNoticeGubunCode("GENERAL");
        payload.setContentsHtml("<p>본문</p>");
        NoticeEmbeddedImageVO image = new NoticeEmbeddedImageVO();
        image.setUploadToken("bde1fdec-5d22-487a-a254-2b9547cd32b3");
        image.setFileName("pasted.png");
        payload.setEmbeddedImages(Collections.singletonList(image));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new NoticeBoardServiceImpl(noticeBoardDAO, mock(CommonFileService.class),
                        mock(CommonCommentService.class)).createPost(1L, payload));

        assertThat(exception.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        verify(noticeBoardDAO, org.mockito.Mockito.never())
                .insertNoticePost(org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void listPostsHydratesAttachmentsCommentsAndPaginationMetadata() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(new NoticeBoardPostVO());
        NoticeBoardPostVO firstPost = new NoticeBoardPostVO();
        firstPost.setPostId(7L);
        NoticeBoardPostVO secondPost = new NoticeBoardPostVO();
        secondPost.setPostId(8L);
        CommonCommentVO comment = new CommonCommentVO();
        comment.setCommentId(10L);
        CommonCommentPageVO commentPage = new CommonCommentPageVO();
        commentPage.setComments(Arrays.asList(comment));
        commentPage.setHasPrevious(true);
        commentPage.setNextBeforeCommentId(9L);
        CommonFileVO commentFile = new CommonFileVO();
        commentFile.setFileId(101L);
        CommonFileVO postFile = new CommonFileVO();
        postFile.setFileId(201L);
        postFile.setOwnerId(7L);
        when(noticeBoardDAO.selectNoticePostList(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(Arrays.asList(firstPost, secondPost));
        when(commonFileService.listFiles(1L, "NOTICE", 7L))
            .thenReturn(Arrays.asList(postFile));
        when(commonFileService.listFiles(1L, "NOTICE", 8L))
            .thenReturn(Collections.emptyList());
        when(commonCommentService.listComments(1L, "NOTICE", 7L, 3, null))
            .thenReturn(commentPage);
        when(commonCommentService.listComments(1L, "NOTICE", 8L, 3, null))
            .thenReturn(new CommonCommentPageVO());
        when(commonCommentService.countComments(1L, "NOTICE", 7L)).thenReturn(4L);
        when(commonCommentService.countComments(1L, "NOTICE", 8L)).thenReturn(0L);
        when(commonFileService.listFiles(1L, "NOTICE_COMMENT", 10L))
            .thenReturn(Arrays.asList(commentFile));

        List<NoticeBoardPostVO> result = new NoticeBoardServiceImpl(
            noticeBoardDAO, commonFileService, commonCommentService)
            .listPosts(1L, " keyword ", 1, 20);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getAttachments()).hasSize(1);
        assertThat(result.get(0).getAttachments().get(0).getBoardFileId()).isEqualTo(201L);
        assertThat(result.get(0).getAttachmentCount()).isEqualTo(1);
        assertThat(result.get(0).getComments()).containsExactly(comment);
        assertThat(result.get(0).getCommentCount()).isEqualTo(4);
        assertThat(result.get(0).isHasPreviousComments()).isTrue();
        assertThat(result.get(0).getNextBeforeCommentId()).isEqualTo(9L);
        assertThat(comment.getAttachments()).containsExactly(commentFile);
        assertThat(result.get(1).getAttachments()).isEmpty();
        assertThat(result.get(1).getAttachmentCount()).isEqualTo(0);
        assertThat(result.get(1).getComments()).isEmpty();
        assertThat(result.get(1).getCommentCount()).isZero();
        verify(commonCommentService).listComments(1L, "NOTICE", 7L, 3, null);
        verify(commonCommentService).listComments(1L, "NOTICE", 8L, 3, null);
        verify(commonFileService).listFiles(1L, "NOTICE", 7L);
        verify(commonFileService).listFiles(1L, "NOTICE", 8L);
        verify(commonFileService).listFiles(1L, "NOTICE_COMMENT", 10L);
    }

    @Test
    void listPostsDoesNotDuplicateCommonFilesOrExposeEmbeddedImagesAsAttachments() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        NoticeBoardPostVO post = new NoticeBoardPostVO();
        post.setPostId(7L);
        CommonFileVO attachment = new CommonFileVO();
        attachment.setFileId(201L);
        attachment.setFileUsageType("ATTACHMENT");
        CommonFileVO embeddedImage = new CommonFileVO();
        embeddedImage.setFileId(202L);
        embeddedImage.setFileUsageType("EMBEDDED");
        CommonCommentPageVO commentPage = new CommonCommentPageVO();
        commentPage.setComments(Collections.emptyList());
        when(noticeBoardDAO.selectNoticePostList(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(Arrays.asList(post));
        when(commonFileService.listFiles(1L, "NOTICE", 7L))
            .thenReturn(Arrays.asList(attachment, embeddedImage));
        when(commonCommentService.listComments(1L, "NOTICE", 7L, 3, null))
            .thenReturn(commentPage);
        when(commonCommentService.countComments(1L, "NOTICE", 7L)).thenReturn(0L);

        NoticeBoardPostVO result = new NoticeBoardServiceImpl(
            noticeBoardDAO, commonFileService, commonCommentService)
            .listPosts(1L, "", 1, 20).get(0);

        assertThat(result.getAttachments()).hasSize(1);
        assertThat(result.getAttachments().get(0).getBoardFileId()).isEqualTo(201L);
        assertThat(result.getAttachmentCount()).isEqualTo(1);
        org.mockito.Mockito.verify(noticeBoardDAO, org.mockito.Mockito.never())
            .selectNoticeAttachmentList(org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void getPostHydratesAttachmentsForEachNoticeComment() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        NoticeBoardPostVO post = new NoticeBoardPostVO();
        CommonCommentVO first = new CommonCommentVO();
        first.setCommentId(10L);
        CommonCommentVO second = new CommonCommentVO();
        second.setCommentId(11L);
        CommonCommentPageVO commentPage = new CommonCommentPageVO();
        commentPage.setComments(Arrays.asList(first, second));

        CommonFileVO firstFile = new CommonFileVO();
        firstFile.setFileId(101L);
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap())).thenReturn(post);
        when(commonFileService.listFiles(1L, "NOTICE", 7L)).thenReturn(Collections.emptyList());
        when(commonCommentService.listComments(1L, "NOTICE", 7L, 3, null)).thenReturn(commentPage);
        when(commonCommentService.countComments(1L, "NOTICE", 7L)).thenReturn(2L);
        when(commonFileService.listFiles(1L, "NOTICE_COMMENT", 10L)).thenReturn(Arrays.asList(firstFile));
        when(commonFileService.listFiles(1L, "NOTICE_COMMENT", 11L)).thenReturn(Collections.emptyList());

        NoticeBoardPostVO result = new NoticeBoardServiceImpl(
                noticeBoardDAO, commonFileService, commonCommentService).getPost(1L, 7L);

        assertThat(result.getComments().get(0).getAttachments()).containsExactly(firstFile);
        assertThat(result.getComments().get(1).getAttachments()).isEmpty();
        verify(commonFileService).listFiles(1L, "NOTICE_COMMENT", 10L);
        verify(commonFileService).listFiles(1L, "NOTICE_COMMENT", 11L);
    }

    @Test
    void replacesExpiredEmbeddedImageSourceWithStableNoticeImageUrl() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        NoticeBoardPostVO post = new NoticeBoardPostVO();
        post.setPostId(7L);
        post.setContentsHtml("<p><img src=\"https://minio.example/expired\" data-object-key=\"tenant/1/notice-temp/token/image.png\"></p>");
        NoticeBoardFileVO embeddedImage = new NoticeBoardFileVO();
        embeddedImage.setBoardFileId(73L);
        embeddedImage.setPostId(7L);
        embeddedImage.setObjectKey("tenant/1/notice-temp/token/image.png");
        embeddedImage.setFileUsageType("EMBEDDED");
        CommonFileVO embeddedCommonFile = new CommonFileVO();
        embeddedCommonFile.setFileId(73L);
        embeddedCommonFile.setTenantId(1L);
        embeddedCommonFile.setOwnerType("NOTICE");
        embeddedCommonFile.setOwnerId(7L);
        embeddedCommonFile.setObjectKey("tenant/1/notice-temp/token/image.png");
        embeddedCommonFile.setFileUsageType("EMBEDDED");
        CommonCommentPageVO commentPage = new CommonCommentPageVO();
        commentPage.setComments(Collections.emptyList());

        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap())).thenReturn(post);
        when(commonFileService.listFiles(1L, "NOTICE", 7L)).thenReturn(Arrays.asList(embeddedCommonFile));
        when(commonCommentService.listComments(1L, "NOTICE", 7L, 3, null)).thenReturn(commentPage);
        when(commonCommentService.countComments(1L, "NOTICE", 7L)).thenReturn(0L);

        NoticeBoardPostVO result = new NoticeBoardServiceImpl(
            noticeBoardDAO, commonFileService, commonCommentService).getPost(1L, 7L);

        assertThat(result.getContentsHtml())
            .contains("/api/v1/groupware/boards/notice/posts/7/embedded-images?objectKey=")
            .doesNotContain("https://minio.example/expired");
    }

    @Test
    void streamsOnlyEmbeddedImageOwnedByNotice() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(new NoticeBoardPostVO());
        CommonFileVO embeddedImage = new CommonFileVO();
        embeddedImage.setFileId(73L);
        embeddedImage.setTenantId(1L);
        embeddedImage.setOwnerType("NOTICE");
        embeddedImage.setOwnerId(7L);
        embeddedImage.setObjectKey("tenant/1/notice-temp/token/image.png");
        embeddedImage.setFileUsageType("EMBEDDED");
        when(commonFileService.listFiles(1L, "NOTICE", 7L))
            .thenReturn(Arrays.asList(embeddedImage));

        new NoticeBoardServiceImpl(noticeBoardDAO, commonFileService, commonCommentService)
            .streamEmbeddedImage(1L, 7L, "tenant/1/notice-temp/token/image.png",
                new MockHttpServletResponse());

        verify(commonFileService).downloadFile(
            org.mockito.ArgumentMatchers.eq(1L),
            org.mockito.ArgumentMatchers.eq("NOTICE"),
            org.mockito.ArgumentMatchers.eq(7L),
            org.mockito.ArgumentMatchers.eq(73L),
            org.mockito.ArgumentMatchers.any());
    }

    @Test
    void deleteAttachmentUsesNoticeOwnerAndPostId() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(new NoticeBoardPostVO());
        CommonCommentPageVO commentPage = new CommonCommentPageVO();
        commentPage.setComments(Collections.emptyList());
        when(commonCommentService.listComments(1L, "NOTICE", 7L, 3, null)).thenReturn(commentPage);
        when(commonCommentService.countComments(1L, "NOTICE", 7L)).thenReturn(0L);
        CommonFileVO attachment = new CommonFileVO();
        attachment.setFileId(8L);
        when(commonFileService.listFiles(1L, "NOTICE", 7L)).thenReturn(Arrays.asList(attachment));

        new NoticeBoardServiceImpl(noticeBoardDAO, commonFileService, commonCommentService)
            .deleteAttachment(1L, 7L, 8L);

        verify(commonFileService).deleteFile(1L, "NOTICE", 7L, 8L);
    }

    @Test
    void deleteAttachmentRejectsEmbeddedImageAsGeneralAttachment() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        CommonFileVO embeddedImage = new CommonFileVO();
        embeddedImage.setFileId(9L);
        embeddedImage.setFileUsageType("EMBEDDED");
        when(commonFileService.listFiles(1L, "NOTICE", 7L))
            .thenReturn(Arrays.asList(embeddedImage));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
            () -> new NoticeBoardServiceImpl(
                noticeBoardDAO, commonFileService, commonCommentService)
                .deleteAttachment(1L, 7L, 9L));

        assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(commonFileService, org.mockito.Mockito.never())
            .deleteFile(1L, "NOTICE", 7L, 9L);
    }

    @Test
    void legacyAttachmentDeleteWithoutPostIdIsRejected() {
        CommonFileService commonFileService = mock(CommonFileService.class);
        NoticeBoardServiceImpl service = new NoticeBoardServiceImpl(
            mock(NoticeBoardDAO.class), commonFileService, mock(CommonCommentService.class));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
            () -> service.deleteAttachment(1L, 8L));

        org.assertj.core.api.Assertions.assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(commonFileService);
    }

    @Test
    void downloadAttachmentUsesNoticeOwnerAndPostId() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(new NoticeBoardPostVO());
        CommonCommentPageVO commentPage = new CommonCommentPageVO();
        commentPage.setComments(Collections.emptyList());
        when(commonCommentService.listComments(1L, "NOTICE", 7L, 3, null)).thenReturn(commentPage);
        when(commonCommentService.countComments(1L, "NOTICE", 7L)).thenReturn(0L);
        CommonFileVO attachment = new CommonFileVO();
        attachment.setFileId(8L);
        when(commonFileService.listFiles(1L, "NOTICE", 7L)).thenReturn(Arrays.asList(attachment));

        new NoticeBoardServiceImpl(noticeBoardDAO, commonFileService, commonCommentService)
            .downloadAttachment(1L, 7L, 8L, new MockHttpServletResponse());

        verify(commonFileService).downloadFile(
            org.mockito.ArgumentMatchers.eq(1L),
            org.mockito.ArgumentMatchers.eq("NOTICE"),
            org.mockito.ArgumentMatchers.eq(7L),
            org.mockito.ArgumentMatchers.eq(8L),
            org.mockito.ArgumentMatchers.any());
    }

    @Test
    void deletePostSoftDeletesNoticeAttachmentsBeforeTheNotice() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        EmbeddedImageStorageService imageStorageService = mock(EmbeddedImageStorageService.class);
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(new NoticeBoardPostVO());
        CommonFileVO attachment = new CommonFileVO();
        attachment.setFileId(21L);
        attachment.setFileUsageType("ATTACHMENT");
        CommonFileVO embeddedImage = new CommonFileVO();
        embeddedImage.setFileId(22L);
        embeddedImage.setFileUsageType("EMBEDDED");
        when(commonFileService.listFiles(1L, "NOTICE", 7L)).thenReturn(Arrays.asList(attachment, embeddedImage));

        new NoticeBoardServiceImpl(noticeBoardDAO, commonFileService, commonCommentService, imageStorageService)
            .deletePost(1L, 7L);

        verify(commonFileService).listFiles(1L, "NOTICE", 7L);
        verify(commonFileService).deleteFile(1L, "NOTICE", 7L, 21L);
        verify(commonFileService, org.mockito.Mockito.never()).deleteFile(1L, "NOTICE", 7L, 22L);
        verify(imageStorageService).completeOwnerSave(eq(1L), eq("NOTICE"), eq(7L),
                eq(Collections.emptyList()), eq(Collections.emptySet()));
        verify(noticeBoardDAO).softDeleteNoticePost(org.mockito.ArgumentMatchers.anyMap());
    }
}