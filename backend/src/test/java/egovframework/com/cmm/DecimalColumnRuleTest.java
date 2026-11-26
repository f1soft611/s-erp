package egovframework.com.cmm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.RoundingMode;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;

class DecimalColumnRuleTest {
    @Test
    void resolvesColumnOverridesUsingTheCallingModulesTypeRules() {
        Map<String, DecimalColumnRule> defaults = Collections.singletonMap("currency",
                new DecimalColumnRule(4, RoundingMode.DOWN));
        Map<String, Object> column = new HashMap<String, Object>();
        column.put("type", "currency");
        column.put("places", 2);
        DecimalColumnRule actual = DecimalColumnRule.resolve(column, defaults, "amount");
        assertEquals(2, actual.getPlaces());
        assertEquals(RoundingMode.DOWN, actual.getRounding());
    }

    @Test
    void inheritsPlacesAndOverridesRounding() {
        Map<String, DecimalColumnRule> defaults = Collections.singletonMap("number",
                new DecimalColumnRule(3, RoundingMode.HALF_UP));
        Map<String, Object> column = new HashMap<String, Object>();
        column.put("type", "number");
        column.put("rounding", "UP");
        DecimalColumnRule actual = DecimalColumnRule.resolve(column, defaults, "quantity");
        assertEquals(3, actual.getPlaces());
        assertEquals(RoundingMode.UP, actual.getRounding());
    }

    @Test
    void rejectsMissingOrInvalidDefinitions() {
        Map<String, DecimalColumnRule> defaults = Collections.singletonMap("number",
                new DecimalColumnRule(0, RoundingMode.HALF_UP));
        assertThrows(IllegalStateException.class, () -> DecimalColumnRule.resolve(null, defaults, "quantity"));
        Map<String, Object> column = new HashMap<String, Object>();
        column.put("type", "number");
        column.put("places", 7);
        assertThrows(IllegalStateException.class, () -> DecimalColumnRule.resolve(column, defaults, "quantity"));
        column.put("places", 2);
        column.put("rounding", "INVALID");
        assertThrows(IllegalStateException.class, () -> DecimalColumnRule.resolve(column, defaults, "quantity"));
        column.remove("rounding");
        column.put("unknown", true);
        assertThrows(IllegalStateException.class, () -> DecimalColumnRule.resolve(column, defaults, "quantity"));
    }
}
