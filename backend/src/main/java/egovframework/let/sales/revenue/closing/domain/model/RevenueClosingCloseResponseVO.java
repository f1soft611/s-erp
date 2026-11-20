package egovframework.let.sales.revenue.closing.domain.model;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RevenueClosingCloseResponseVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private int closedCount;
    private List<Map<String, Object>> items;
}
