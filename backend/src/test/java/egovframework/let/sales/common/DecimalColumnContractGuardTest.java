package egovframework.let.sales.common;

import egovframework.com.cmm.DecimalPolicy;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * 소수점 계약 가드레일(docs/spec/20261126/20261126_001_공통_소수점_계약_가드레일_상세사양서.md).
 * 계약 JSON을 바꾸면 이 테스트로 문서 전체의 유효성과 서버 사용 필드와의 일치를 확인한다.
 */
class DecimalColumnContractGuardTest {
    /**
     * 서버가 소수점 규칙으로 계산·저장하지 않고 화면에서 정수 표시·입력 규칙만 쓰는 문서.
     * 서버 사용 필드 대조에서 제외하며, 계약에서 사라진 문서는 이 목록에서도 제거해야 한다.
     */
    private static final Set<String> FRONTEND_ONLY_DOCUMENTS = new HashSet<String>(java.util.Arrays.asList(
            "settings.module", "settings.menu", "settings.role",
            "co.itemPartnerPriceSummary", "co.classification", "co.commonCode", "co.workStandard",
            "groupware.archivePost", "groupware.file"));
    private static final Pattern SERVER_FIELD = Pattern.compile(
            "\\.(?:input|amount|places)\\(\"(\\w+)\"|policyAmount\\(\\s*\\w+,\\s*\"(\\w+)\"|validAmount\\([^\"]*\"(\\w+)\",\\s*decimalPolicy");

    private static Map<String, Map<String, Object>> contracts() throws IOException {
        try (InputStream input = DecimalColumnContractGuardTest.class.getResourceAsStream("/decimal-column-contract.json")) {
            assertNotNull(input, "소수점 계약 리소스가 없습니다.");
            return new ObjectMapper().readValue(input, new TypeReference<Map<String, Map<String, Object>>>() { });
        }
    }

    @Test
    void everyDocumentAndColumnIsValidForTheServer() throws IOException {
        Map<String, Map<String, Object>> sales = new HashMap<String, Map<String, Object>>();
        for (Map.Entry<String, Map<String, Object>> document : contracts().entrySet()) {
            // DecimalPolicy.from은 문서의 모든 컬럼을 검증하고, 잘못되면 IllegalStateException을 던진다.
            DecimalPolicy.forModule("SALES", sales, document.getValue());
        }
        assertFalse(contracts().isEmpty());
    }

    @Test
    void serverUsesOnlyFieldsThatTheContractDeclaresAndDeclaresNoUnusedField() throws IOException {
        Set<String> declared = new HashSet<String>();
        for (Map.Entry<String, Map<String, Object>> document : contracts().entrySet()) {
            if (!FRONTEND_ONLY_DOCUMENTS.contains(document.getKey())) declared.addAll(document.getValue().keySet());
        }
        Set<String> used = serverUsedFields();
        assertFalse(used.isEmpty(), "서버 소스에서 컬럼 규칙 사용을 찾지 못했습니다.");
        Set<String> missing = new HashSet<String>(used);
        missing.removeAll(declared);
        assertTrue(missing.isEmpty(), "계약에 없는 필드를 서버가 사용합니다: " + missing);
        Set<String> unused = new HashSet<String>(declared);
        unused.removeAll(used);
        assertTrue(unused.isEmpty(), "서버가 사용하지 않는 계약 필드가 있습니다: " + unused);
    }

    @Test
    void frontendOnlyDocumentsExistInTheContract() throws IOException {
        Set<String> missing = new HashSet<String>(FRONTEND_ONLY_DOCUMENTS);
        missing.removeAll(contracts().keySet());
        assertTrue(missing.isEmpty(), "계약에 없는 화면 전용 문서가 허용 목록에 있습니다: " + missing);
    }

    @Test
    void everyContractDocumentIsLoadedThroughTheServerContract() throws IOException {
        Map<String, Object> loaded = new LinkedHashMap<String, Object>();
        for (String document : contracts().keySet()) {
            loaded.put(document, egovframework.com.cmm.DecimalColumnContract.forDocument(document));
        }
        assertEquals(contracts().keySet(), loaded.keySet());
    }

    private static Set<String> serverUsedFields() throws IOException {
        List<Path> files = new java.util.ArrayList<Path>();
        for (String module : new String[] { "sales", "co" }) {
            Path root = Paths.get("src", "main", "java", "egovframework", "let", module);
            try (Stream<Path> walk = Files.walk(root)) {
                files.addAll(walk.filter(path -> path.toString().endsWith(".java")).collect(Collectors.toList()));
            }
        }
        Set<String> used = new HashSet<String>();
        for (Path file : files) {
            String source = new String(Files.readAllBytes(file), StandardCharsets.UTF_8);
            Matcher matcher = SERVER_FIELD.matcher(source);
            while (matcher.find()) {
                for (int group = 1; group <= matcher.groupCount(); group++) {
                    if (matcher.group(group) != null) used.add(matcher.group(group));
                }
            }
        }
        return Collections.unmodifiableSet(used);
    }
}
