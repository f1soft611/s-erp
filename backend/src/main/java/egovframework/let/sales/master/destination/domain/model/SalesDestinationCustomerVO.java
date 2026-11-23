package egovframework.let.sales.master.destination.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDestinationCustomerVO {
    private Long customerId;
    private String customerCode;
    private String customerName;
    private Boolean hasDestination;
}
