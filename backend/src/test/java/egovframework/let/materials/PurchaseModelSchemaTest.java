package egovframework.let.materials;

import static org.junit.jupiter.api.Assertions.assertTrue;

import io.swagger.v3.oas.annotations.media.Schema;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * 구매자재·품질 API 모델의 Swagger @Schema 설명 존재 여부를 검증하는 테스트.
 *
 * @author S-ERP
 */
class PurchaseModelSchemaTest {

    private static final String[] ROOTS = {
        "src/main/java/egovframework/let/materials",
        "src/main/java/egovframework/let/quality"
    };

    @Test
    void 모든_도메인_모델_클래스와_필드에_Schema_설명이_있다() throws Exception {
        List<String> missing = new ArrayList<String>();
        int checked = 0;
        for (String root : ROOTS) {
            Path base = Paths.get(root);
            for (Path file : modelFiles(base)) {
                String rel = Paths.get("src/main/java").relativize(file).toString().replace('\\', '/');
                String name = rel.substring(0, rel.length() - ".java".length()).replace('/', '.');
                checked += verify(Class.forName(name), missing);
            }
        }
        assertTrue(checked > 40, "검사한 모델 수가 너무 적다: " + checked);
        assertTrue(missing.isEmpty(), "Schema 설명 누락:\n" + String.join("\n", missing));
    }

    private static List<Path> modelFiles(Path base) throws IOException {
        try (Stream<Path> s = Files.walk(base)) {
            return s.filter(p -> p.toString().replace('\\', '/').contains("/domain/model/"))
                    .filter(p -> p.toString().endsWith(".java"))
                    .collect(Collectors.toList());
        }
    }

    private static int verify(Class<?> type, List<String> missing) {
        int count = 1;
        Schema cls = type.getAnnotation(Schema.class);
        if (cls == null || cls.description().trim().isEmpty()) {
            missing.add(type.getName());
        } else {
            assertNoRestrictedAttrs(cls, type.getName(), missing);
        }
        for (Field f : type.getDeclaredFields()) {
            if (Modifier.isStatic(f.getModifiers()) || f.isSynthetic()) {
                continue;
            }
            Schema s = f.getAnnotation(Schema.class);
            if (s == null || s.description().trim().isEmpty()) {
                missing.add(type.getName() + "#" + f.getName());
            } else {
                assertNoRestrictedAttrs(s, type.getName() + "#" + f.getName(), missing);
            }
        }
        for (Class<?> inner : type.getDeclaredClasses()) {
            count += verify(inner, missing);
        }
        return count;
    }

    private static void assertNoRestrictedAttrs(Schema s, String where, List<String> missing) {
        if (s.required() || s.allowableValues().length > 0) {
            missing.add(where + " (required/allowableValues 사용 금지)");
        }
        if (s.description().contains("VO 클래스")) {
            missing.add(where + " (설명에 'VO 클래스' 표현)");
        }
    }
}
