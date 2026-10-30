package egovframework.let.groupware.approval.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "전자결재 사용자 댓글 요청")
public class DocumentApprovalCommentRequestVO {

    @Schema(description = "댓글 내용")
    private String content;

    @Schema(description = "상위 댓글 ID")
    private Long parentCommentId;

    @Schema(description = "댓글 멘션 대상 사용자 ID")
    private List<Long> mentionedUserIds;

    @Schema(description = "문서 접근 가능 사용자 전체 멘션 여부")
    private boolean mentionAll;

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Long getParentCommentId() {
        return parentCommentId;
    }

    public void setParentCommentId(Long parentCommentId) {
        this.parentCommentId = parentCommentId;
    }

    public List<Long> getMentionedUserIds() {
        return mentionedUserIds;
    }

    public void setMentionedUserIds(List<Long> mentionedUserIds) {
        this.mentionedUserIds = mentionedUserIds;
    }

    public boolean isMentionAll() {
        return mentionAll;
    }

    public void setMentionAll(boolean mentionAll) {
        this.mentionAll = mentionAll;
    }
}
