package egovframework.let.system.policies.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.TextNode;

import egovframework.let.system.policies.domain.model.SystemPolicyHistoryVO;
import egovframework.let.system.policies.domain.model.SystemPolicyOptionVO;
import egovframework.let.system.policies.domain.model.SystemPolicySaveRequestVO;
import egovframework.let.system.policies.domain.model.SystemPolicyTenantValueVO;
import egovframework.let.system.policies.domain.model.SystemPolicyUserVO;
import egovframework.let.system.policies.domain.model.SystemPolicyVO;
import egovframework.let.system.policies.domain.repository.SystemPolicyDAO;
import egovframework.let.system.policies.service.SystemPolicyService;

/**
 * 현재 테넌트 시스템 정책 관리 서비스 구현
 * @author S-ERP
 * @since 2026.11.05
 * @version 1.0
 */
@Service("systemPolicyService")
public class SystemPolicyServiceImpl extends EgovAbstractServiceImpl implements SystemPolicyService {

    static final String DELIVERY_PLAN_MODE = "DELIVERY_PLAN_MODE";
    static final String OVER_DELIVERY_POLICY = "OVER_DELIVERY_POLICY";

    private static final Set<String> BUILT_IN_CODES =
            Collections.unmodifiableSet(new HashSet<String>(Arrays.asList(DELIVERY_PLAN_MODE, OVER_DELIVERY_POLICY)));
    private static final Set<String> VALUE_TYPES = Collections.unmodifiableSet(new HashSet<String>(
            Arrays.asList("BOOLEAN", "NUMBER", "SELECT", "TEXT", "DATE", "USER_LIST")));
    private static final Pattern CODE_PATTERN = Pattern.compile("^[A-Z0-9_]{2,80}$");
    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("uuuu-MM-dd").withResolverStyle(ResolverStyle.STRICT);
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<SystemPolicyOptionVO>> OPTION_LIST = new TypeReference<List<SystemPolicyOptionVO>>() {
    };

    private static final int MAX_NAME = 100;
    private static final int MAX_CATEGORY = 80;
    private static final int MAX_DESCRIPTION = 1000;
    private static final int MAX_TEXT = 2000;
    private static final int MAX_OPTIONS = 50;
    private static final int MAX_OPTION_TEXT = 100;
    private static final int MAX_UNIT = 30;
    private static final int MAX_USERS = 100;
    private static final int MAX_KEYWORD = 100;

    private final SystemPolicyDAO systemPolicyDAO;

    public SystemPolicyServiceImpl(SystemPolicyDAO systemPolicyDAO) {
        this.systemPolicyDAO = systemPolicyDAO;
    }

    @Override
    public List<SystemPolicyVO> listPolicies(Long tenantId) throws Exception {
        List<SystemPolicyVO> policies = systemPolicyDAO.selectPolicyList(tenantId);
        if (policies == null) {
            return Collections.emptyList();
        }
        for (SystemPolicyVO policy : policies) {
            hydrate(policy);
        }
        return policies;
    }

    @Override
    @Transactional
    public SystemPolicyVO createPolicy(Long tenantId, Long actorId, SystemPolicySaveRequestVO request) throws Exception {
        requireRequest(request);
        String code = trim(request.getPolicyCode());
        if (!CODE_PATTERN.matcher(code).matches()) {
            throw badRequest("정책 코드는 영문 대문자, 숫자, 밑줄(_)로 2~80자여야 합니다.");
        }
        if (BUILT_IN_CODES.contains(code)) {
            throw badRequest("시스템 기본 정책 코드는 등록할 수 없습니다.");
        }
        String type = trim(request.getValueType());
        if (!VALUE_TYPES.contains(type)) {
            throw badRequest("지원하지 않는 값 유형입니다.");
        }
        Definition definition = normalizeDefinition(tenantId, type, request);

        Map<String, Object> codeParams = new HashMap<String, Object>();
        codeParams.put("tenantId", tenantId);
        codeParams.put("policyCode", code);
        Long existingId = systemPolicyDAO.selectPolicyIdByCode(codeParams);
        if (existingId != null && existingId > 0) {
            throw conflict("이미 사용 중인 정책 코드입니다.");
        }

        Map<String, Object> params = definition.toParams(tenantId, actorId);
        params.put("policyCode", code);
        params.put("valueType", type);
        Long policyId;
        try {
            policyId = systemPolicyDAO.insertPolicy(params);
        } catch (DuplicateKeyException ex) {
            throw conflict("이미 사용 중인 정책 코드입니다.");
        }

        SystemPolicyVO snapshot = definition.toPolicy(policyId, code, type, 1, false);
        insertHistory(tenantId, actorId, policyId, code, "CREATE", null, definition.valueJson, null, snapshot);
        return reloadOrDefault(tenantId, policyId, snapshot);
    }

    @Override
    @Transactional
    public SystemPolicyVO updatePolicy(Long tenantId, Long actorId, Long policyId, SystemPolicySaveRequestVO request)
            throws Exception {
        requireRequest(request);
        if (request.getVersion() == null) {
            throw badRequest("수정 기준 버전이 필요합니다.");
        }
        SystemPolicyVO current = lockPolicy(tenantId, policyId);
        if (!request.getVersion().equals(current.getVersion())) {
            throw conflict("다른 사용자가 먼저 정책을 변경했습니다. 다시 조회해 주세요.");
        }
        if (StringUtils.hasText(request.getPolicyCode()) && !trim(request.getPolicyCode()).equals(current.getPolicyCode())) {
            throw badRequest("정책 코드는 변경할 수 없습니다.");
        }
        if (StringUtils.hasText(request.getValueType()) && !trim(request.getValueType()).equals(current.getValueType())) {
            throw badRequest("값 유형은 변경할 수 없습니다.");
        }

        Definition definition;
        String beforeValueJson = writeJson(current.getValue());
        if (current.isSystemPolicy()) {
            definition = normalizeSystemDefinition(current, request);
            String newValue = definition.value.textValue();
            SystemPolicyTenantValueVO tenantValues = systemPolicyDAO.selectTenantPolicyValuesForUpdate(tenantId);
            if (tenantValues == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "테넌트 정보를 찾을 수 없습니다.");
            }
            boolean mode = DELIVERY_PLAN_MODE.equals(current.getPolicyCode());
            String actual = mode ? tenantValues.getDeliveryPlanMode() : tenantValues.getOverDeliveryPolicy();
            if (actual != null) {
                beforeValueJson = writeJson(TextNode.valueOf(actual));
                current.setValue(TextNode.valueOf(actual));
            }
            if (mode && !newValue.equals(actual) && systemPolicyDAO.existsDeliveryPlanHeader(tenantId)) {
                throw conflict("납품계획이 이미 존재하여 납품계획 운영모드를 변경할 수 없습니다.");
            }
            Map<String, Object> tenantParams = new HashMap<String, Object>();
            tenantParams.put("tenantId", tenantId);
            tenantParams.put("value", newValue);
            int updated = mode ? systemPolicyDAO.updateTenantDeliveryPlanMode(tenantParams)
                    : systemPolicyDAO.updateTenantOverDeliveryPolicy(tenantParams);
            if (updated != 1) {
                throw conflict("테넌트 정책 값을 변경하지 못했습니다.");
            }
        } else {
            definition = normalizeDefinition(tenantId, current.getValueType(), request);
        }

        Map<String, Object> params = definition.toParams(tenantId, actorId);
        params.put("policyId", current.getPolicyId());
        params.put("version", current.getVersion());
        if (systemPolicyDAO.updatePolicy(params) != 1) {
            throw conflict("다른 사용자가 먼저 정책을 변경했습니다. 다시 조회해 주세요.");
        }

        SystemPolicyVO snapshot = definition.toPolicy(current.getPolicyId(), current.getPolicyCode(),
                current.getValueType(), current.getVersion() + 1, current.isSystemPolicy());
        insertHistory(tenantId, actorId, current.getPolicyId(), current.getPolicyCode(), "UPDATE",
                beforeValueJson, definition.valueJson, current, snapshot);
        return reloadOrDefault(tenantId, current.getPolicyId(), snapshot);
    }

    @Override
    @Transactional
    public void deletePolicy(Long tenantId, Long actorId, Long policyId, Integer version) throws Exception {
        if (version == null) {
            throw badRequest("삭제 기준 버전이 필요합니다.");
        }
        SystemPolicyVO current = lockPolicy(tenantId, policyId);
        if (current.isSystemPolicy()) {
            throw badRequest("시스템 기본 정책은 삭제할 수 없습니다.");
        }
        if (!version.equals(current.getVersion())) {
            throw conflict("다른 사용자가 먼저 정책을 변경했습니다. 다시 조회해 주세요.");
        }
        insertHistory(tenantId, actorId, current.getPolicyId(), current.getPolicyCode(), "DELETE",
                writeJson(current.getValue()), null, current, null);
        Map<String, Object> params = idParams(tenantId, current.getPolicyId());
        params.put("version", version);
        if (systemPolicyDAO.deletePolicy(params) != 1) {
            throw conflict("다른 사용자가 먼저 정책을 변경했습니다. 다시 조회해 주세요.");
        }
    }

    @Override
    public List<SystemPolicyHistoryVO> listHistory(Long tenantId, Long policyId) throws Exception {
        if (policyId == null) {
            throw badRequest("정책 ID가 필요합니다.");
        }
        List<SystemPolicyHistoryVO> histories = systemPolicyDAO.selectPolicyHistoryList(idParams(tenantId, policyId));
        if (histories == null) {
            return Collections.emptyList();
        }
        for (SystemPolicyHistoryVO history : histories) {
            history.setBeforeValue(readJson(history.getBeforeValueJson()));
            history.setAfterValue(readJson(history.getAfterValueJson()));
        }
        return histories;
    }

    @Override
    public List<SystemPolicyUserVO> searchUsers(Long tenantId, String keyword) throws Exception {
        String normalized = trim(keyword);
        if (normalized.length() > MAX_KEYWORD) {
            throw badRequest("검색어는 100자 이하여야 합니다.");
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("keyword", escapeLike(normalized));
        List<SystemPolicyUserVO> users = systemPolicyDAO.selectActiveUsers(params);
        return users == null ? Collections.<SystemPolicyUserVO>emptyList() : users;
    }

    private SystemPolicyVO lockPolicy(Long tenantId, Long policyId) throws Exception {
        if (policyId == null) {
            throw badRequest("정책 ID가 필요합니다.");
        }
        SystemPolicyVO current = systemPolicyDAO.selectPolicyByIdForUpdate(idParams(tenantId, policyId));
        if (current == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "정책을 찾을 수 없습니다.");
        }
        hydrate(current);
        return current;
    }

    private SystemPolicyVO reloadOrDefault(Long tenantId, Long policyId, SystemPolicyVO fallback) throws Exception {
        SystemPolicyVO saved = systemPolicyDAO.selectPolicyById(idParams(tenantId, policyId));
        if (saved == null) {
            return fallback;
        }
        hydrate(saved);
        return saved;
    }

    private void insertHistory(Long tenantId, Long actorId, Long policyId, String policyCode, String action,
            String beforeValueJson, String afterValueJson, SystemPolicyVO before, SystemPolicyVO after) throws Exception {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("policyId", policyId);
        params.put("policyCode", policyCode);
        params.put("action", action);
        params.put("beforeValueJson", beforeValueJson);
        params.put("afterValueJson", afterValueJson);
        params.put("beforeSnapshotJson", before == null ? null : writeJson(before));
        params.put("afterSnapshotJson", after == null ? null : writeJson(after));
        params.put("actorId", actorId);
        systemPolicyDAO.insertPolicyHistory(params);
    }

    private Definition normalizeSystemDefinition(SystemPolicyVO current, SystemPolicySaveRequestVO request) {
        if (!BUILT_IN_CODES.contains(current.getPolicyCode())) {
            throw badRequest("지원하지 않는 시스템 정책입니다.");
        }
        if (request.getMinValue() != null || request.getMaxValue() != null) {
            throw badRequest("시스템 기본 정책의 범위는 변경할 수 없습니다.");
        }
        String currentUnit = current.getUnit() == null ? "" : current.getUnit();
        if (request.getUnit() != null && !trim(request.getUnit()).equals(currentUnit)) {
            throw badRequest("시스템 기본 정책의 단위는 변경할 수 없습니다.");
        }
        List<SystemPolicyOptionVO> options = current.getOptions();
        if (request.getOptions() != null && !sameOptions(normalizeOptions(request.getOptions()), options)) {
            throw badRequest("시스템 기본 정책의 선택지는 변경할 수 없습니다.");
        }
        JsonNode value = request.getValue();
        if (value == null || !value.isTextual() || !optionValues(options).contains(value.textValue())) {
            throw badRequest("허용된 선택지 값만 저장할 수 있습니다.");
        }
        requireUnchanged(request.getPolicyName(), current.getPolicyName(), "정책명");
        requireUnchanged(request.getCategory(), current.getCategory(), "분류");
        requireUnchanged(request.getDescription(), current.getDescription(), "설명");
        Definition definition = new Definition();
        definition.policyName = current.getPolicyName();
        definition.category = current.getCategory();
        definition.description = current.getDescription() == null ? "" : current.getDescription();
        definition.value = value;
        definition.valueJson = writeJson(value);
        definition.options = options;
        definition.optionsJson = writeJson(options);
        definition.unit = currentUnit;
        return definition;
    }

    private static void requireUnchanged(String requested, String stored, String label) {
        if (requested != null && !trim(requested).equals(trim(stored))) {
            throw badRequest("시스템 기본 정책의 " + label + "은(는) 변경할 수 없습니다.");
        }
    }

    private Definition normalizeDefinition(Long tenantId, String type, SystemPolicySaveRequestVO request) throws Exception {
        Definition definition = normalizeCommon(request);
        JsonNode value = request.getValue();
        if (value == null || value.isNull() || value.isMissingNode()) {
            throw badRequest("정책 값은 필수입니다.");
        }
        definition.options = Collections.emptyList();
        definition.unit = "";
        if ("BOOLEAN".equals(type)) {
            if (!value.isBoolean()) {
                throw badRequest("BOOLEAN 정책 값은 true 또는 false여야 합니다.");
            }
        } else if ("NUMBER".equals(type)) {
            validateNumber(value, request.getMinValue(), request.getMaxValue());
            definition.minValue = request.getMinValue();
            definition.maxValue = request.getMaxValue();
            definition.unit = trim(request.getUnit());
            if (definition.unit.length() > MAX_UNIT) {
                throw badRequest("단위는 30자 이하여야 합니다.");
            }
        } else if ("SELECT".equals(type)) {
            List<SystemPolicyOptionVO> options = normalizeOptions(request.getOptions());
            if (!value.isTextual() || !optionValues(options).contains(value.textValue())) {
                throw badRequest("SELECT 정책 값은 선택지 중 하나여야 합니다.");
            }
            definition.options = options;
        } else if ("TEXT".equals(type)) {
            if (!value.isTextual() || value.textValue().length() > MAX_TEXT) {
                throw badRequest("TEXT 정책 값은 2000자 이하 문자열이어야 합니다.");
            }
        } else if ("DATE".equals(type)) {
            validateDate(value);
        } else if ("USER_LIST".equals(type)) {
            validateUsers(tenantId, value);
        } else {
            throw badRequest("지원하지 않는 값 유형입니다.");
        }
        definition.value = value;
        definition.valueJson = writeJson(value);
        definition.optionsJson = writeJson(definition.options);
        return definition;
    }

    private Definition normalizeCommon(SystemPolicySaveRequestVO request) {
        Definition definition = new Definition();
        definition.policyName = requireText(request.getPolicyName(), MAX_NAME, "정책명");
        definition.category = requireText(request.getCategory(), MAX_CATEGORY, "분류");
        definition.description = trim(request.getDescription());
        if (definition.description.length() > MAX_DESCRIPTION) {
            throw badRequest("설명은 1000자 이하여야 합니다.");
        }
        return definition;
    }

    private void validateNumber(JsonNode value, BigDecimal min, BigDecimal max) {
        if (!value.isNumber()) {
            throw badRequest("NUMBER 정책 값은 숫자여야 합니다.");
        }
        if ((value.isDouble() || value.isFloat()) && (Double.isNaN(value.doubleValue()) || Double.isInfinite(value.doubleValue()))) {
            throw badRequest("NUMBER 정책 값은 유한한 숫자여야 합니다.");
        }
        if (min != null && max != null && min.compareTo(max) > 0) {
            throw badRequest("최소값은 최대값보다 클 수 없습니다.");
        }
        BigDecimal number = value.decimalValue();
        if ((min != null && number.compareTo(min) < 0) || (max != null && number.compareTo(max) > 0)) {
            throw badRequest("NUMBER 정책 값이 허용 범위를 벗어났습니다.");
        }
    }

    private void validateDate(JsonNode value) {
        if (!value.isTextual()) {
            throw badRequest("DATE 정책 값은 YYYY-MM-DD 문자열이어야 합니다.");
        }
        try {
            LocalDate.parse(value.textValue(), DATE_FORMAT);
        } catch (DateTimeParseException ex) {
            throw badRequest("DATE 정책 값은 유효한 YYYY-MM-DD 날짜여야 합니다.");
        }
    }

    private void validateUsers(Long tenantId, JsonNode value) throws Exception {
        if (!value.isArray() || value.size() > MAX_USERS) {
            throw badRequest("USER_LIST 정책 값은 최대 100명의 사용자 ID 배열이어야 합니다.");
        }
        Set<Long> ids = new LinkedHashSet<Long>();
        for (JsonNode item : value) {
            if (!item.isIntegralNumber() || !item.canConvertToLong() || item.longValue() <= 0) {
                throw badRequest("USER_LIST 정책 값은 양의 정수 사용자 ID여야 합니다.");
            }
            if (!ids.add(item.longValue())) {
                throw badRequest("USER_LIST 정책 값에 중복 사용자가 있습니다.");
            }
        }
        if (ids.isEmpty()) {
            return;
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("userIds", new ArrayList<Long>(ids));
        if (systemPolicyDAO.countActiveUsersByIds(params) != ids.size()) {
            throw badRequest("현재 테넌트의 사용 중인 사용자만 선택할 수 있습니다.");
        }
    }

    private List<SystemPolicyOptionVO> normalizeOptions(List<SystemPolicyOptionVO> options) {
        if (options == null || options.isEmpty() || options.size() > MAX_OPTIONS) {
            throw badRequest("SELECT 정책 선택지는 1~50개여야 합니다.");
        }
        List<SystemPolicyOptionVO> normalized = new ArrayList<SystemPolicyOptionVO>();
        Set<String> values = new HashSet<String>();
        for (SystemPolicyOptionVO option : options) {
            if (option == null) {
                throw badRequest("선택지 값과 표시명은 필수입니다.");
            }
            String value = requireText(option.getValue(), MAX_OPTION_TEXT, "선택지 값");
            String label = requireText(option.getLabel(), MAX_OPTION_TEXT, "선택지 표시명");
            if (!values.add(value)) {
                throw badRequest("선택지 값은 중복될 수 없습니다.");
            }
            normalized.add(new SystemPolicyOptionVO(value, label));
        }
        return normalized;
    }

    private boolean sameOptions(List<SystemPolicyOptionVO> left, List<SystemPolicyOptionVO> right) {
        if (left == null || right == null || left.size() != right.size()) {
            return false;
        }
        for (int i = 0; i < left.size(); i++) {
            if (!left.get(i).getValue().equals(right.get(i).getValue())
                    || !left.get(i).getLabel().equals(right.get(i).getLabel())) {
                return false;
            }
        }
        return true;
    }

    private Set<String> optionValues(List<SystemPolicyOptionVO> options) {
        Set<String> values = new HashSet<String>();
        if (options != null) {
            for (SystemPolicyOptionVO option : options) {
                values.add(option.getValue());
            }
        }
        return values;
    }

    private void hydrate(SystemPolicyVO policy) {
        policy.setValue(readJson(policy.getValueJson()));
        policy.setOptions(readOptions(policy.getOptionsJson()));
        if (policy.getUnit() == null) {
            policy.setUnit("");
        }
        if (policy.getDescription() == null) {
            policy.setDescription("");
        }
    }

    private static JsonNode readJson(String json) {
        if (json == null) {
            return null;
        }
        try {
            return MAPPER.readTree(json);
        } catch (Exception ex) {
            throw new IllegalStateException("저장된 정책 JSON을 해석할 수 없습니다.", ex);
        }
    }

    private static List<SystemPolicyOptionVO> readOptions(String json) {
        if (!StringUtils.hasText(json)) {
            return new ArrayList<SystemPolicyOptionVO>();
        }
        try {
            return MAPPER.readValue(json, OPTION_LIST);
        } catch (Exception ex) {
            throw new IllegalStateException("저장된 정책 선택지를 해석할 수 없습니다.", ex);
        }
    }

    private static String writeJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("정책 JSON을 생성할 수 없습니다.", ex);
        }
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static Map<String, Object> idParams(Long tenantId, Long policyId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("policyId", policyId);
        return params;
    }

    private static void requireRequest(SystemPolicySaveRequestVO request) {
        if (request == null) {
            throw badRequest("요청 본문이 필요합니다.");
        }
    }

    private static String requireText(String value, int maxLength, String label) {
        String trimmed = trim(value);
        if (trimmed.isEmpty()) {
            throw badRequest(label + "은(는) 필수입니다.");
        }
        if (trimmed.length() > maxLength) {
            throw badRequest(label + "은(는) " + maxLength + "자 이하여야 합니다.");
        }
        return trimmed;
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private static final class Definition {
        private String policyName;
        private String category;
        private String description;
        private JsonNode value;
        private String valueJson;
        private List<SystemPolicyOptionVO> options;
        private String optionsJson;
        private BigDecimal minValue;
        private BigDecimal maxValue;
        private String unit;

        private Map<String, Object> toParams(Long tenantId, Long actorId) {
            Map<String, Object> params = new HashMap<String, Object>();
            params.put("tenantId", tenantId);
            params.put("actorId", actorId);
            params.put("policyName", policyName);
            params.put("category", category);
            params.put("description", description);
            params.put("valueJson", valueJson);
            params.put("optionsJson", optionsJson);
            params.put("minValue", minValue);
            params.put("maxValue", maxValue);
            params.put("unit", unit);
            return params;
        }

        private SystemPolicyVO toPolicy(Long policyId, String code, String type, int version, boolean systemPolicy) {
            SystemPolicyVO policy = new SystemPolicyVO();
            policy.setPolicyId(policyId);
            policy.setPolicyCode(code);
            policy.setPolicyName(policyName);
            policy.setCategory(category);
            policy.setDescription(description);
            policy.setValueType(type);
            policy.setValue(value);
            policy.setOptions(options);
            policy.setMinValue(minValue);
            policy.setMaxValue(maxValue);
            policy.setUnit(unit);
            policy.setVersion(version);
            policy.setSystemPolicy(systemPolicy);
            return policy;
        }
    }
}