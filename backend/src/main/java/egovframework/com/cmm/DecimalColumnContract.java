package egovframework.com.cmm;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class DecimalColumnContract {
    private static final Map<String, Map<String, Object>> CONTRACTS = load();

    private DecimalColumnContract() {
    }

    public static Map<String, Object> forDocument(String document) {
        Map<String, Object> contract = CONTRACTS.get(document);
        if (contract == null) throw new IllegalArgumentException("알 수 없는 소수점 계약: " + document);
        return contract;
    }

    private static Map<String, Map<String, Object>> load() {
        try (InputStream input = DecimalColumnContract.class.getResourceAsStream("/decimal-column-contract.json")) {
            if (input == null) throw new IllegalStateException("소수점 계약 리소스가 없습니다.");
            Map<String, Map<String, Map<String, Object>>> raw = new ObjectMapper().readValue(input,
                    new TypeReference<Map<String, Map<String, Map<String, Object>>>>() { });
            Map<String, Map<String, Object>> result = new LinkedHashMap<String, Map<String, Object>>();
            for (Map.Entry<String, Map<String, Map<String, Object>>> document : raw.entrySet()) {
                Map<String, Object> fields = new LinkedHashMap<String, Object>();
                for (Map.Entry<String, Map<String, Object>> field : document.getValue().entrySet()) {
                    fields.put(field.getKey(), Collections.unmodifiableMap(new LinkedHashMap<String, Object>(field.getValue())));
                }
                result.put(document.getKey(), Collections.unmodifiableMap(fields));
            }
            return Collections.unmodifiableMap(result);
        } catch (IOException exception) {
            throw new IllegalStateException("소수점 계약을 읽을 수 없습니다.", exception);
        }
    }
}
