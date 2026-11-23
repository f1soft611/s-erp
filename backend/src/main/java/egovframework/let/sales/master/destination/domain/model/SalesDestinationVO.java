package egovframework.let.sales.master.destination.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "거래처별 납품처")
public class SalesDestinationVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long salesDestinationId;
    private Long customerId;
    private String destinationCode;
    private String destinationName;
    private String businessNo;
    private String address;
    private String contactName;
    private String mobileNo;
    private String telephoneNo;
    private String facsimileNo;
    private String remark;
}
