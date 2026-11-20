package egovframework.let.sales.revenue.closing.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RevenueClosingCustomerSummaryVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long customerId;
    private String customerCode;
    private String customerName;
    private Long totalCount;
    private Long closedCount;
    private Long openCount;
}
