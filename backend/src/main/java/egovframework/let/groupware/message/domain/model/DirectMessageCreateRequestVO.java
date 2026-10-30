package egovframework.let.groupware.message.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DirectMessageCreateRequestVO {
    private Long recipientUserId;
    private String subject;
    private String content;
}
