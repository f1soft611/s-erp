package egovframework.let.sales.revenue.closing.domain.model;

import java.io.Serializable;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RevenueClosingCloseRequestVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private List<Long> salesDeliveryDetailIds;
    private String statementDt;
}
