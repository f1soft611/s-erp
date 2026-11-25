package egovframework.let.sales.common;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import egovframework.com.cmm.DecimalColumnRule;

public final class SalesDecimalPolicy {
    private static final BigDecimal MAX_INTEGER = new BigDecimal("10000000000000");
    private final Rule quantity;
    private final Rule price;
    private final Rule amount;
    private final Map<String, Object> columns;

    private SalesDecimalPolicy(Rule quantity, Rule price, Rule amount, Map<String, Object> columns) {
        this.quantity = quantity;
        this.price = price;
        this.amount = amount;
        this.columns = columns;
    }

    public static SalesDecimalPolicy from(Map<String, Map<String, Object>> policies) {
        return from(policies, Collections.<String, Object>emptyMap());
    }

    public static SalesDecimalPolicy from(Map<String, Map<String, Object>> policies, Map<String, Object> columns) {
        Map<String, Object> module = policies == null ? null : policies.get("SALES");
        SalesDecimalPolicy policy = new SalesDecimalPolicy(resolve(module, "number", 0), resolve(module, "decimal", 3),
                resolve(module, "currency", 3), columns == null ? Collections.<String, Object>emptyMap() : columns);
        for (String field : policy.columns.keySet()) policy.columnRule(field);
        return policy;
    }

    public BigDecimal input(String field, BigDecimal value, String label) {
        return input(value, label, columnRule(field));
    }

    public BigDecimal amount(String field, BigDecimal value, String label) {
        Rule rule = columnRule(field);
        BigDecimal result = value.setScale(rule.places, rule.rounding);
        validateRange(result, label);
        return result;
    }

    public void verifyColumnContract(Map<String, Object> snapshot) {
        if (snapshot == null && !hasOverrides()) return;
        if (!columns.equals(snapshot)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "컬럼 소수점 설정이 변경되었습니다. 화면을 새로고침하고 금액을 확인해 주세요.");
        }
    }

    private boolean hasOverrides() {
        for (Object value : columns.values()) {
            if (!(value instanceof Map)) throw new IllegalStateException("컬럼 소수점 설정을 확인해 주세요.");
            Map<?, ?> column = (Map<?, ?>) value;
            if (column.containsKey("places") || column.containsKey("rounding") || column.containsKey("trailingZeros")) return true;
        }
        return false;
    }

    private Rule columnRule(String field) {
        Map<String, DecimalColumnRule> types = new HashMap<String, DecimalColumnRule>();
        types.put("number", new DecimalColumnRule(quantity.places, quantity.rounding));
        types.put("decimal", new DecimalColumnRule(price.places, price.rounding));
        types.put("currency", new DecimalColumnRule(amount.places, amount.rounding));
        DecimalColumnRule rule = DecimalColumnRule.resolve(columns.get(field), types, field);
        return new Rule(rule.getPlaces(), rule.getRounding());
    }

    public BigDecimal inputQuantity(BigDecimal value, String label) {
        return input(value, label, quantity);
    }

    public BigDecimal inputAmount(BigDecimal value, String label) {
        return input(value, label, amount);
    }

    public BigDecimal inputPrice(BigDecimal value, String label) {
        return input(value, label, price);
    }

    public BigDecimal storedQuantity(BigDecimal value, String label) {
        return input(value, label, new Rule(6, RoundingMode.HALF_UP));
    }

    public BigDecimal amount(BigDecimal value, String label) {
        BigDecimal result = value.setScale(amount.places, amount.rounding);
        validateRange(result, label);
        return result;
    }

    public void verifySnapshot(Map<String, Object> snapshot) {
        if (snapshot == null) return;
        if (!matches(snapshot, "number", quantity) || !matches(snapshot, "decimal", price)
                || !matches(snapshot, "currency", amount)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "소수점 정책이 변경되었습니다. 화면을 새로고침하고 금액을 확인해 주세요.");
        }
    }

    private boolean matches(Map<String, Object> snapshot, String type, Rule expected) {
        Object value = snapshot.containsKey("places") ? snapshot : snapshot.get(type);
        if (!(value instanceof Map)) return false;
        Map<?, ?> rule = (Map<?, ?>) value;
        Object places = rule.get("places");
        Object rounding = rule.get("rounding");
        if (!(places instanceof Number) || !expected.rounding.name().equals(rounding)) return false;
        try {
            return new BigDecimal(places.toString()).compareTo(BigDecimal.valueOf(expected.places)) == 0;
        } catch (NumberFormatException exception) {
            return false;
        }
    }

    private BigDecimal input(BigDecimal value, String label, Rule rule) {
        BigDecimal result;
        try {
            result = value.setScale(rule.places, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw badRequest(label + "은 소수 " + rule.places + "자리까지 입력할 수 있습니다.");
        }
        validateRange(result, label);
        return result;
    }

    private void validateRange(BigDecimal value, String label) {
        if (value.abs().compareTo(MAX_INTEGER) >= 0) {
            throw badRequest(label + "이 허용 범위를 초과했습니다.");
        }
    }

    private static Rule resolve(Map<String, Object> module, String type, int defaultPlaces) {
        if (module == null) return new Rule(defaultPlaces, RoundingMode.HALF_UP);
        Object value = module.containsKey("places") ? module : module.get(type);
        if (!(value instanceof Map)) return new Rule(defaultPlaces, RoundingMode.HALF_UP);
        Map<?, ?> rule = (Map<?, ?>) value;
        Object places = rule.get("places");
        int count = places instanceof Number ? ((Number) places).intValue() : defaultPlaces;
        if (count < 0 || count > 6) count = defaultPlaces;
        Object rounding = rule.get("rounding");
        RoundingMode mode = "UP".equals(rounding) ? RoundingMode.UP
                : "DOWN".equals(rounding) ? RoundingMode.DOWN : RoundingMode.HALF_UP;
        return new Rule(count, mode);
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static final class Rule {
        private final int places;
        private final RoundingMode rounding;

        private Rule(int places, RoundingMode rounding) {
            this.places = places;
            this.rounding = rounding;
        }
    }
}
