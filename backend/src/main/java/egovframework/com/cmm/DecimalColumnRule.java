package egovframework.com.cmm;

import java.math.RoundingMode;
import java.util.Map;

public final class DecimalColumnRule {
    private final int places;
    private final RoundingMode rounding;

    public DecimalColumnRule(int places, RoundingMode rounding) {
        if (places < 0 || places > 6 || (rounding != RoundingMode.UP
                && rounding != RoundingMode.DOWN && rounding != RoundingMode.HALF_UP)) {
            throw new IllegalArgumentException("소수점 기본 규칙을 확인해 주세요.");
        }
        this.places = places;
        this.rounding = rounding;
    }

    public int getPlaces() {
        return places;
    }

    public RoundingMode getRounding() {
        return rounding;
    }

    public static DecimalColumnRule resolve(Object definition, Map<String, DecimalColumnRule> types, String field) {
        if (!(definition instanceof Map)) throw invalid(field);
        Map<?, ?> column = (Map<?, ?>) definition;
        for (Object key : column.keySet()) {
            if ((!("type".equals(key) || "places".equals(key) || "rounding".equals(key)
                    || "trailingZeros".equals(key))) || column.get(key) == null) throw invalid(field);
        }
        Object type = column.get("type");
        DecimalColumnRule base = types.get(type);
        if (base == null) throw invalid(field);
        int places = base.places;
        Object count = column.get("places");
        if (count != null) {
            if (!(count instanceof Number) || ((Number) count).doubleValue() != ((Number) count).intValue()
                    || ((Number) count).intValue() < 0 || ((Number) count).intValue() > 6) throw invalid(field);
            places = ((Number) count).intValue();
        }
        RoundingMode rounding = base.rounding;
        Object mode = column.get("rounding");
        if (mode != null) {
            if (!"UP".equals(mode) && !"DOWN".equals(mode) && !"HALF_UP".equals(mode)) throw invalid(field);
            rounding = RoundingMode.valueOf((String) mode);
        }
        Object zeros = column.get("trailingZeros");
        if (zeros != null && !"FIXED".equals(zeros) && !"AUTO".equals(zeros)) throw invalid(field);
        return new DecimalColumnRule(places, rounding);
    }

    private static IllegalStateException invalid(String field) {
        return new IllegalStateException("컬럼 소수점 설정을 확인해 주세요: " + field);
    }
}
