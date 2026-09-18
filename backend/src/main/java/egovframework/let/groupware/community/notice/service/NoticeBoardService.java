package egovframework.let.groupware.community.notice.service;

import java.util.List;

import javax.servlet.http.HttpServletResponse;

import org.springframework.web.multipart.MultipartFile;

import egovframework.let.groupware.community.notice.domain.model.NoticeBoardFileVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostSaveRequestVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;

public interface NoticeBoardService {
    List<NoticeBoardPostVO> listPosts(Long tenantId, String keyword, int page, int size) throws Exception;

    List<NoticeBoardPostVO> listPosts(Long tenantId, String keyword, int page, int size, String noticeGubunCode) throws Exception;

    NoticeBoardPostVO getPost(Long tenantId, Long postId) throws Exception;

    NoticeBoardPostVO createPost(Long tenantId, NoticeBoardPostSaveRequestVO payload) throws Exception;

    NoticeBoardPostVO createPost(Long tenantId, NoticeBoardPostSaveRequestVO payload, String actorId, String actorName) throws Exception;

    NoticeBoardPostVO updatePost(Long tenantId, Long postId, NoticeBoardPostSaveRequestVO payload) throws Exception;

    NoticeBoardPostVO updatePost(Long tenantId, Long postId, NoticeBoardPostSaveRequestVO payload, String actorId, String actorName) throws Exception;

    void deletePost(Long tenantId, Long postId) throws Exception;

    void deletePost(Long tenantId, Long postId, String actorId, String actorName) throws Exception;

    NoticeBoardFileVO uploadAttachment(Long tenantId, Long postId, MultipartFile file, String uploaderId) throws Exception;

    void deleteAttachment(Long tenantId, Long boardFileId) throws Exception;

    void deleteAttachment(Long tenantId, Long postId, Long boardFileId) throws Exception;

    void downloadAttachment(Long tenantId, Long boardFileId, HttpServletResponse response) throws Exception;

    void downloadAttachment(Long tenantId, Long postId, Long boardFileId, HttpServletResponse response) throws Exception;
}
