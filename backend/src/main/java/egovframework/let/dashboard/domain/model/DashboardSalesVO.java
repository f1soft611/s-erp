package egovframework.let.dashboard.domain.model;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DashboardSalesVO {
    private String month;
    private String from;
    private String to;
    private String asOfDate;
    private String fetchedAt;
    private Long orderCount = 0L;
    private BigDecimal supplyAmount = BigDecimal.ZERO;
    private BigDecimal totalAmount = BigDecimal.ZERO;
    private Long upcomingCount = 0L;
    private List<Trend> trend = new ArrayList<>();
    private List<Upcoming> upcoming = new ArrayList<>();

    @Getter
    @Setter
    public static class Trend {
        private String month;
        private Long orderCount = 0L;
        private BigDecimal supplyAmount = BigDecimal.ZERO;
    }

    @Getter
    @Setter
    public static class Upcoming {
        private Long salesOrderId;
        private String orderNo;
        private String customerName;
        private String deliveryDt;
    }
}
