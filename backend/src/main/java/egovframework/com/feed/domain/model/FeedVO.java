package egovframework.com.feed.domain.model;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Generated;

@Schema(description = "공통 피드 모델")
public class FeedVO implements Serializable {
    private static final long serialVersionUID = 1L;

    @Schema(description = "피드 ID")
    private Long feedId;
    @Schema(description = "테넌트 ID")
    private Long tenantId;
    @Schema(description = "이벤트 타입")
    private String eventType;
    @Schema(description = "대상 타입")
    private String targetType;
    @Schema(description = "대상 ID")
    private Long targetId;
    @Schema(description = "행동자 ID")
    private String actorId;
    @Schema(description = "행동자 이름")
    private String actorName;
    @Schema(description = "메시지")
    private String message;
    @Schema(description = "추가 메타 JSON")
    private String metadataJson;
    @Schema(description = "읽음 여부")
    private String readYn;
    @Schema(description = "생성 일시")
    private Date createdAt;

    @Generated
    public Long getFeedId() { return feedId; }
    @Generated
    public void setFeedId(Long feedId) { this.feedId = feedId; }
    @Generated
    public Long getTenantId() { return tenantId; }
    @Generated
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    @Generated
    public String getEventType() { return eventType; }
    @Generated
    public void setEventType(String eventType) { this.eventType = eventType; }
    @Generated
    public String getTargetType() { return targetType; }
    @Generated
    public void setTargetType(String targetType) { this.targetType = targetType; }
    @Generated
    public Long getTargetId() { return targetId; }
    @Generated
    public void setTargetId(Long targetId) { this.targetId = targetId; }
    @Generated
    public String getActorId() { return actorId; }
    @Generated
    public void setActorId(String actorId) { this.actorId = actorId; }
    @Generated
    public String getActorName() { return actorName; }
    @Generated
    public void setActorName(String actorName) { this.actorName = actorName; }
    @Generated
    public String getMessage() { return message; }
    @Generated
    public void setMessage(String message) { this.message = message; }
    @Generated
    public String getMetadataJson() { return metadataJson; }
    @Generated
    public void setMetadataJson(String metadataJson) { this.metadataJson = metadataJson; }
    @Generated
    public String getReadYn() { return readYn; }
    @Generated
    public void setReadYn(String readYn) { this.readYn = readYn; }
    @Generated
    public Date getCreatedAt() { return createdAt; }
    @Generated
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
