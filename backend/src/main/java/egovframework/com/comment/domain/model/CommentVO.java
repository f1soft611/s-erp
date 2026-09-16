package egovframework.com.comment.domain.model;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Generated;

@Schema(description = "공통 댓글 모델")
public class CommentVO implements Serializable {
    private static final long serialVersionUID = 1L;

    @Schema(description = "댓글 ID")
    private Long commentId;
    @Schema(description = "테넌트 ID")
    private Long tenantId;
    @Schema(description = "대상 타입")
    private String targetType;
    @Schema(description = "대상 ID")
    private Long targetId;
    @Schema(description = "부모 댓글 ID")
    private Long parentCommentId;
    @Schema(description = "댓글 내용")
    private String content;
    @Schema(description = "작성자 ID")
    private String writerId;
    @Schema(description = "작성자 이름")
    private String writerName;
    @Schema(description = "삭제 여부")
    private String deletedYn;
    @Schema(description = "생성 일시")
    private Date createdAt;
    @Schema(description = "수정 일시")
    private Date updatedAt;

    @Generated
    public Long getCommentId() { return commentId; }
    @Generated
    public void setCommentId(Long commentId) { this.commentId = commentId; }
    @Generated
    public Long getTenantId() { return tenantId; }
    @Generated
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    @Generated
    public String getTargetType() { return targetType; }
    @Generated
    public void setTargetType(String targetType) { this.targetType = targetType; }
    @Generated
    public Long getTargetId() { return targetId; }
    @Generated
    public void setTargetId(Long targetId) { this.targetId = targetId; }
    @Generated
    public Long getParentCommentId() { return parentCommentId; }
    @Generated
    public void setParentCommentId(Long parentCommentId) { this.parentCommentId = parentCommentId; }
    @Generated
    public String getContent() { return content; }
    @Generated
    public void setContent(String content) { this.content = content; }
    @Generated
    public String getWriterId() { return writerId; }
    @Generated
    public void setWriterId(String writerId) { this.writerId = writerId; }
    @Generated
    public String getWriterName() { return writerName; }
    @Generated
    public void setWriterName(String writerName) { this.writerName = writerName; }
    @Generated
    public String getDeletedYn() { return deletedYn; }
    @Generated
    public void setDeletedYn(String deletedYn) { this.deletedYn = deletedYn; }
    @Generated
    public Date getCreatedAt() { return createdAt; }
    @Generated
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    @Generated
    public Date getUpdatedAt() { return updatedAt; }
    @Generated
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
}
