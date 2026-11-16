package egovframework.let.materials.order.create.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class PurchaseOrderAmountCalculatorTest {

    private static BigDecimal d(String value) {
        return new BigDecimal(value);
    }

    @Test
    void taxableExcludedAddsTenPercentOnSupply() {
        PurchaseOrderAmountCalculator.Amounts amounts = PurchaseOrderAmountCalculator.calculate(
                d("3"), d("1200.5"), "TAXABLE", false, null);
        assertThat(amounts.getSupplyAmt()).isEqualByComparingTo("3601.50");
        assertThat(amounts.getVatAmt()).isEqualByComparingTo("360.15");
        assertThat(amounts.getTotalAmt()).isEqualByComparingTo("3961.65");
    }

    @Test
    void taxableIncludedSplitsGrossIntoSupplyAndVat() {
        PurchaseOrderAmountCalculator.Amounts amounts = PurchaseOrderAmountCalculator.calculate(
                d("10"), d("1100"), "TAXABLE", true, null);
        assertThat(amounts.getSupplyAmt()).isEqualByComparingTo("10000.00");
        assertThat(amounts.getVatAmt()).isEqualByComparingTo("1000.00");
        assertThat(amounts.getTotalAmt()).isEqualByComparingTo("11000.00");
    }

    @Test
    void taxableIncludedRoundsSupplyAndKeepsGrossAsTotal() {
        PurchaseOrderAmountCalculator.Amounts amounts = PurchaseOrderAmountCalculator.calculate(
                d("1"), d("100"), "TAXABLE", true, null);
        assertThat(amounts.getSupplyAmt()).isEqualByComparingTo("90.91");
        assertThat(amounts.getVatAmt()).isEqualByComparingTo("9.09");
        assertThat(amounts.getTotalAmt()).isEqualByComparingTo("100.00");
    }

    @Test
    void zeroRatedAndExemptHaveNoVat() {
        for (String taxType : new String[] {"ZERO_RATED", "EXEMPT"}) {
            PurchaseOrderAmountCalculator.Amounts amounts = PurchaseOrderAmountCalculator.calculate(
                    d("2"), d("500"), taxType, false, null);
            assertThat(amounts.getSupplyAmt()).isEqualByComparingTo("1000.00");
            assertThat(amounts.getVatAmt()).isEqualByComparingTo("0.00");
            assertThat(amounts.getTotalAmt()).isEqualByComparingTo("1000.00");
        }
    }

    @Test
    void editedVatReplacesCalculatedVatAndRecalculatesTotal() {
        PurchaseOrderAmountCalculator.Amounts amounts = PurchaseOrderAmountCalculator.calculate(
                d("10"), d("1000"), "TAXABLE", false, d("900"));
        assertThat(amounts.getSupplyAmt()).isEqualByComparingTo("10000.00");
        assertThat(amounts.getVatAmt()).isEqualByComparingTo("900.00");
        assertThat(amounts.getTotalAmt()).isEqualByComparingTo("10900.00");
    }

    @Test
    void missingUnitPriceGivesZeroAmounts() {
        PurchaseOrderAmountCalculator.Amounts amounts = PurchaseOrderAmountCalculator.calculate(
                d("5"), null, "TAXABLE", false, null);
        assertThat(amounts.getSupplyAmt()).isEqualByComparingTo("0.00");
        assertThat(amounts.getVatAmt()).isEqualByComparingTo("0.00");
        assertThat(amounts.getTotalAmt()).isEqualByComparingTo("0.00");
    }

    @Test
    void rejectsIncludedVatForNonTaxableAndVatEditForNonTaxable() {
        assertThatThrownBy(() -> PurchaseOrderAmountCalculator.calculate(
                d("1"), d("10"), "EXEMPT", true, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PurchaseOrderAmountCalculator.calculate(
                d("1"), d("10"), "ZERO_RATED", false, d("1"))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsNegativeValuesAndUnknownTaxType() {
        assertThatThrownBy(() -> PurchaseOrderAmountCalculator.calculate(
                d("1"), d("-1"), "TAXABLE", false, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PurchaseOrderAmountCalculator.calculate(
                d("1"), d("1"), "TAXABLE", false, d("-1"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PurchaseOrderAmountCalculator.calculate(
                d("1"), d("1"), "UNKNOWN", false, null)).isInstanceOf(IllegalArgumentException.class);
    }
}
