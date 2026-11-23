package egovframework.let.co.master.itempartnerprice.service.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.util.StringUtils;

/**
 * 단가 조회의 품목 계정분류(tb_material_info.material_type_code) 멀티선택 조건 해석.
 * 쉼표로 이은 코드 문자열을 허용 코드만 남긴 목록으로 바꾼다. 비어 있으면 전체(빈 목록)이다.
 *
 * @author S-ERP
 * @since 2026.11.23
 * @version 1.0
 */
final class ItemTypeFilters {

    private static final Set<String> ALLOWED = Collections.unmodifiableSet(new HashSet<String>(
            Arrays.asList("PRODUCT", "SEMI", "GOODS", "RAW", "SUB", "SUPPLY")));

    private ItemTypeFilters() {
    }

    /** 허용되지 않는 코드가 있으면 IllegalArgumentException(400). */
    static List<String> parse(String raw) {
        List<String> result = new ArrayList<String>();
        if (!StringUtils.hasText(raw)) {
            return result;
        }
        Set<String> codes = new LinkedHashSet<String>();
        for (String token : raw.split(",")) {
            String code = token.trim();
            if (code.isEmpty()) {
                continue;
            }
            if (!ALLOWED.contains(code)) {
                throw new IllegalArgumentException("품목 계정분류 조건이 올바르지 않습니다.");
            }
            codes.add(code);
        }
        result.addAll(codes);
        return result;
    }
}
