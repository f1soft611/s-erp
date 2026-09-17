package egovframework.let.groupware.notice.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.mock.web.MockHttpServletResponse;

import egovframework.com.common.domain.model.CommonCommentPageVO;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.service.CommonCommentService;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.groupware.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.notice.domain.repository.NoticeBoardDAO;

class NoticeBoardServiceImplTest {

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
        commentPage.setComments(List.of(first, second));

        CommonFileVO firstFile = new CommonFileVO();
        firstFile.setFileId(101L);
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap())).thenReturn(post);
        when(noticeBoardDAO.selectNoticeAttachmentList(org.mockito.ArgumentMatchers.anyMap())).thenReturn(List.of());
        when(commonCommentService.listComments(1L, "NOTICE", 7L, 3, null)).thenReturn(commentPage);
        when(commonCommentService.countComments(1L, "NOTICE", 7L)).thenReturn(2L);
        when(commonFileService.listFiles(1L, "NOTICE_COMMENT", 10L)).thenReturn(List.of(firstFile));
        when(commonFileService.listFiles(1L, "NOTICE_COMMENT", 11L)).thenReturn(List.of());

        NoticeBoardPostVO result = new NoticeBoardServiceImpl(
                noticeBoardDAO, commonFileService, commonCommentService).getPost(1L, 7L);

        assertThat(result.getComments().get(0).getAttachments()).containsExactly(firstFile);
        assertThat(result.getComments().get(1).getAttachments()).isEmpty();
        verify(commonFileService).listFiles(1L, "NOTICE_COMMENT", 10L);
        verify(commonFileService).listFiles(1L, "NOTICE_COMMENT", 11L);
    }

    @Test
    void deleteAttachmentUsesNoticeOwnerAndPostId() throws Exception {
        NoticeBoardDAO noticeBoardDAO = mock(NoticeBoardDAO.class);
        CommonFileService commonFileService = mock(CommonFileService.class);
        CommonCommentService commonCommentService = mock(CommonCommentService.class);
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(new NoticeBoardPostVO());
        CommonCommentPageVO commentPage = new CommonCommentPageVO();
        commentPage.setComments(List.of());
        when(commonCommentService.listComments(1L, "NOTICE", 7L, 3, null)).thenReturn(commentPage);
        when(commonCommentService.countComments(1L, "NOTICE", 7L)).thenReturn(0L);
        CommonFileVO attachment = new CommonFileVO();
        attachment.setFileId(8L);
        when(commonFileService.listFiles(1L, "NOTICE", 7L)).thenReturn(List.of(attachment));

        new NoticeBoardServiceImpl(noticeBoardDAO, commonFileService, commonCommentService)
            .deleteAttachment(1L, 7L, 8L);

        verify(commonFileService).deleteFile(1L, "NOTICE", 7L, 8L);
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
        commentPage.setComments(List.of());
        when(commonCommentService.listComments(1L, "NOTICE", 7L, 3, null)).thenReturn(commentPage);
        when(commonCommentService.countComments(1L, "NOTICE", 7L)).thenReturn(0L);
        CommonFileVO attachment = new CommonFileVO();
        attachment.setFileId(8L);
        when(commonFileService.listFiles(1L, "NOTICE", 7L)).thenReturn(List.of(attachment));

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
        when(noticeBoardDAO.selectNoticePostById(org.mockito.ArgumentMatchers.anyMap()))
            .thenReturn(new NoticeBoardPostVO());
        CommonFileVO first = new CommonFileVO();
        first.setFileId(21L);
        CommonFileVO second = new CommonFileVO();
        second.setFileId(22L);
        when(commonFileService.listFiles(1L, "NOTICE", 7L)).thenReturn(List.of(first, second));

        new NoticeBoardServiceImpl(noticeBoardDAO, commonFileService, commonCommentService)
            .deletePost(1L, 7L);

        verify(commonFileService).listFiles(1L, "NOTICE", 7L);
        verify(commonFileService).deleteFile(1L, "NOTICE", 7L, 21L);
        verify(commonFileService).deleteFile(1L, "NOTICE", 7L, 22L);
        verify(noticeBoardDAO).softDeleteNoticePost(org.mockito.ArgumentMatchers.anyMap());
    }
}