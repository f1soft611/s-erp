package egovframework.let.sales.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class SalesDecimalColumnPolicyTest {
    @Test
    void appliesColumnOverridesIndependentlyAndChecksContract() {
        Map<String, Object> currency = new HashMap<String, Object>();
        currency.put("places", 3);
        currency.put("rounding", "DOWN");
        Map<String, Object> module = new HashMap<String, Object>();
        module.put("currency", currency);
        Map<String, Map<String, Object>> policies = Collections.singletonMap("SALES", module);
        Map<String, Object> supply = new HashMap<String, Object>();
        supply.put("type", "currency");
        supply.put("places", 2);
        supply.put("rounding", "HALF_UP");
        Map<String, Object> total = new HashMap<String, Object>();
        total.put("type", "currency");
        Map<String, Object> contract = new HashMap<String, Object>();
        contract.put("supplyAmount", supply);
        contract.put("totalAmount", total);

        SalesDecimalPolicy policy = SalesDecimalPolicy.from(policies, contract);
        assertEquals(new BigDecimal("1.24"), policy.amount("supplyAmount", new BigDecimal("1.235"), "공급가"));
        assertEquals(new BigDecimal("1.235"), policy.amount("totalAmount", new BigDecimal("1.2359"), "합계"));
        policy.verifyColumnContract(contract);
        ResponseStatusException conflict = assertThrows(ResponseStatusException.class,
                () -> policy.verifyColumnContract(Collections.<String, Object>emptyMap()));
        assertEquals(HttpStatus.CONFLICT, conflict.getStatus());
        assertThrows(ResponseStatusException.class, () -> policy.verifyColumnContract(null));
    }

    @Test
    void permitsLegacyClientsWhenThereAreNoColumnOverrides() {
        Map<String, Object> quantity = Collections.<String, Object>singletonMap("type", "number");
        SalesDecimalPolicy policy = SalesDecimalPolicy.from(null, Collections.singletonMap("quantity", (Object) quantity));
        policy.verifyColumnContract(null);
        assertEquals(new BigDecimal("2"), policy.input("quantity", new BigDecimal("2.0"), "수량"));
    }

    @Test
    void rejectsMalformedContractsBeforeAcceptingAnySave() {
        Object[][] invalid = {
            { "type", "invalid" }, { "places", 7 }, { "places", 1.5 },
            { "rounding", "OTHER" }, { "trailingZeros", "OTHER" },
            { "places", null }, { "extra", 1 }
        };
        for (Object[] entry : invalid) {
            Map<String, Object> column = new HashMap<String, Object>();
            column.put("type", "number");
            column.put((String) entry[0], entry[1]);
            Map<String, Object> contract = Collections.singletonMap("quantity", (Object) column);
            assertThrows(IllegalStateException.class, () -> {
                SalesDecimalPolicy policy = SalesDecimalPolicy.from(null, contract);
                policy.verifyColumnContract(contract);
            }, entry[0].toString());
        }
    }
}
