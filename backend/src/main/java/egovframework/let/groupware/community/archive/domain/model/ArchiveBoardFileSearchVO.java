package egovframework.let.groupware.community.archive.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ArchiveBoardFileSearchVO {
    private Long tenantId;
    private Integer offset = 0;
    private Integer limit = 20;
    private String keyword;
    private String folderCode;
}
