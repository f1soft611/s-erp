package egovframework.let.co.master.itempartnerprice.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ItemPartnerPriceImportResolutionVO {
    private Integer sourceRowNumber;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private Long customerId;
    private String customerCode;
    private String customerName;
    private Long existingPriceId;
}
