package egovframework.let.groupware.message.domain.model;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DirectMessageVO {
    private Long threadId;
    private Long messageId;
    private Long senderUserId;
    private String senderUserName;
    private Long recipientUserId;
    private String recipientUserName;
    private Long otherUserId;
    private String otherUserName;
    private String otherUserProfileImage;
    private String subject;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
    private LocalDateTime updatedAt;
    private LocalDateTime hiddenAt;
    private Long unreadCount;
    private String latestContent;
    private LocalDateTime latestMessageAt;
}
