package egovframework.let.uat.uia.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MyProfileVO {
    private String userId;
    private String name;
    private String email;
    private String departmentName;
    private String levelName;
    private String profileImage;
    private String stampImage;
}
