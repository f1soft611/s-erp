package egovframework.let.materials.order.create.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 발주 행의 공급가·세액·합계를 부가세구분·포함 여부에 따라 계산하는 클래스.
 * 반올림은 영업 수주(roundSalesOrderAmount)와 같이 소수 둘째 자리 반올림(HALF_UP)이다.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
public final class PurchaseOrderAmountCalculator {

    public static final String TAXABLE = "TAXABLE";
    public static final String ZERO_RATED = "ZERO_RATED";
    public static final String EXEMPT = "EXEMPT";

    private static final int SCALE = 2;
    private static final BigDecimal VAT_RATE = new BigDecimal("0.1");
    private static final BigDecimal VAT_DIVISOR = new BigDecimal("1.1");

    private PurchaseOrderAmountCalculator() {
    }

    /**
     * @param qty 발주수량(0 이상)
     * @param unitPrice 발주단가(null이면 금액 0)
     * @param taxType TAXABLE, ZERO_RATED, EXEMPT
     * @param vatIncluded 부가세 포함 여부(과세만 true 가능)
     * @param vatOverride 직접 수정한 세액(null이면 계산, 영세·면세는 null 또는 0만 허용)
     */
    public static Amounts calculate(BigDecimal qty, BigDecimal unitPrice, String taxType, boolean vatIncluded,
            BigDecimal vatOverride) {
        if (!TAXABLE.equals(taxType) && !ZERO_RATED.equals(taxType) && !EXEMPT.equals(taxType)) {
            throw new IllegalArgumentException("부가세구분이 올바르지 않습니다.");
        }
        boolean taxable = TAXABLE.equals(taxType);
        if (vatIncluded && !taxable) {
            throw new IllegalArgumentException("영세·면세는 부가세 포함을 선택할 수 없습니다.");
        }
        if (qty == null || qty.signum() < 0 || (unitPrice != null && unitPrice.signum() < 0)) {
            throw new IllegalArgumentException("수량과 단가는 0 이상이어야 합니다.");
        }
        if (vatOverride != null && vatOverride.signum() < 0) {
            throw new IllegalArgumentException("세액은 0 이상이어야 합니다.");
        }
        if (!taxable && vatOverride != null && vatOverride.signum() != 0) {
            throw new IllegalArgumentException("영세·면세는 세액을 입력할 수 없습니다.");
        }
        BigDecimal gross = unitPrice == null
                ? BigDecimal.ZERO.setScale(SCALE)
                : qty.multiply(unitPrice).setScale(SCALE, RoundingMode.HALF_UP);

        BigDecimal supply;
        BigDecimal vat;
        if (!taxable) {
            supply = gross;
            vat = BigDecimal.ZERO.setScale(SCALE);
        } else if (vatIncluded) {
            supply = gross.divide(VAT_DIVISOR, SCALE, RoundingMode.HALF_UP);
            vat = gross.subtract(supply);
        } else {
            supply = gross;
            vat = supply.multiply(VAT_RATE).setScale(SCALE, RoundingMode.HALF_UP);
        }
        if (taxable && vatOverride != null) {
            vat = vatOverride.setScale(SCALE, RoundingMode.HALF_UP);
        }
        BigDecimal total = (taxable && vatIncluded && vatOverride == null) ? gross : supply.add(vat);
        return new Amounts(supply, vat, total);
    }

    /** 계산 결과(공급가, 세액, 합계). */
    public static final class Amounts {
        private final BigDecimal supplyAmt;
        private final BigDecimal vatAmt;
        private final BigDecimal totalAmt;

        Amounts(BigDecimal supplyAmt, BigDecimal vatAmt, BigDecimal totalAmt) {
            this.supplyAmt = supplyAmt;
            this.vatAmt = vatAmt;
            this.totalAmt = totalAmt;
        }

        public BigDecimal getSupplyAmt() {
            return supplyAmt;
        }

        public BigDecimal getVatAmt() {
            return vatAmt;
        }

        public BigDecimal getTotalAmt() {
            return totalAmt;
        }
    }
}
