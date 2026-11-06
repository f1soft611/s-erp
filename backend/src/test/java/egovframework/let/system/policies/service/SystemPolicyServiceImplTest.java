package egovframework.let.system.policies.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.system.policies.domain.model.SystemPolicySaveRequestVO;
import egovframework.let.system.policies.domain.model.SystemPolicyTenantValueVO;
import egovframework.let.system.policies.domain.model.SystemPolicyVO;
import egovframework.let.system.policies.domain.repository.SystemPolicyDAO;
import egovframework.let.system.policies.service.impl.SystemPolicyServiceImpl;

class SystemPolicyServiceImplTest {

    private static final Long TENANT = 1L;
    private static final Long ACTOR = 42L;
    private static final String MODE_OPTIONS =
            "[{\"value\":\"AUTO\",\"label\":\"자동 생성\"},{\"value\":\"MANUAL\",\"label\":\"수동 등록\"}]";
    private static final String OVER_OPTIONS =
            "[{\"value\":\"BLOCK\",\"label\":\"초과 차단\"},{\"value\":\"WARN\",\"label\":\"경고 후 허용\"}]";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private SystemPolicyDAO dao;
    private SystemPolicyServiceImpl service;

    @BeforeEach
    void setUp() {
        dao = mock(SystemPolicyDAO.class);
        service = new SystemPolicyServiceImpl(dao);
    }

    @Test
    void listConvertsStoredJsonIntoRawValuesAndOptions() throws Exception {
        SystemPolicyVO stored = stored(4L, "DELIVERY_PLAN_MODE", "SELECT", "\"MANUAL\"", MODE_OPTIONS, true, 2);
        SystemPolicyVO flag = stored(5L, "FLAG", "BOOLEAN", "false", "[]", false, 1);
        when(dao.selectPolicyList(TENANT)).thenReturn(listOf(stored, flag));

        List<SystemPolicyVO> result = service.listPolicies(TENANT);

        assertThat(result.get(0).getValue().textValue()).isEqualTo("MANUAL");
        assertThat(result.get(0).getOptions()).extracting("value").containsExactly("AUTO", "MANUAL");
        assertThat(result.get(1).getValue().isBoolean()).isTrue();
        assertThat(result.get(1).getValue().booleanValue()).isFalse();
        assertThat(result.get(1).getOptions()).isEmpty();
    }

    @Test
    void createAcceptsExplicitFalseZeroAndEmptyUserListAndWritesCreateHistory() throws Exception {
        when(dao.insertPolicy(anyMap())).thenReturn(10L, 11L, 12L);
        when(dao.selectPolicyById(anyMap())).thenAnswer(invocation -> {
            Map<String, Object> params = invocation.getArgument(0);
            Long id = (Long) params.get("policyId");
            if (id == 10L) {
                return stored(10L, "FLAG", "BOOLEAN", "false", "[]", false, 1);
            }
            if (id == 11L) {
                return stored(11L, "LIMIT", "NUMBER", "0", "[]", false, 1);
            }
            return stored(12L, "APPROVERS", "USER_LIST", "[]", "[]", false, 1);
        });

        service.createPolicy(TENANT, ACTOR, request("{\"policyCode\":\"FLAG\",\"policyName\":\"플래그\","
                + "\"category\":\"공통\",\"valueType\":\"BOOLEAN\",\"value\":false}"));
        service.createPolicy(TENANT, ACTOR, request("{\"policyCode\":\"LIMIT\",\"policyName\":\"한도\","
                + "\"category\":\"공통\",\"valueType\":\"NUMBER\",\"value\":0,\"minValue\":0,\"maxValue\":10,\"unit\":\"건\"}"));
        SystemPolicyVO users = service.createPolicy(TENANT, ACTOR, request("{\"policyCode\":\"APPROVERS\","
                + "\"policyName\":\"승인자\",\"category\":\"공통\",\"valueType\":\"USER_LIST\",\"value\":[]}"));

        ArgumentCaptor<Map<String, Object>> insert = mapCaptor();
        verify(dao, org.mockito.Mockito.times(3)).insertPolicy(insert.capture());
        assertThat(insert.getAllValues()).extracting(params -> params.get("valueJson")).containsExactly("false", "0", "[]");
        assertThat(insert.getAllValues()).allSatisfy(params -> {
            assertThat(params.get("tenantId")).isEqualTo(TENANT);
            assertThat(params.get("actorId")).isEqualTo(ACTOR);
        });
        assertThat(insert.getAllValues().get(1).get("unit")).isEqualTo("건");
        assertThat(insert.getAllValues().get(0).get("unit")).isEqualTo("");
        assertThat(insert.getAllValues().get(0).get("minValue")).isNull();
        verify(dao, never()).countActiveUsersByIds(anyMap());
        ArgumentCaptor<Map<String, Object>> history = mapCaptor();
        verify(dao, org.mockito.Mockito.times(3)).insertPolicyHistory(history.capture());
        assertThat(history.getValue().get("action")).isEqualTo("CREATE");
        assertThat(history.getValue().get("beforeValueJson")).isNull();
        assertThat(history.getValue().get("afterValueJson")).isEqualTo("[]");
        assertThat((String) history.getValue().get("afterSnapshotJson")).contains("\"policyCode\":\"APPROVERS\"");
        assertThat(users.getValue().isArray()).isTrue();
    }

    @Test
    void createRejectsInvalidDefinitionsWithoutWriting() throws Exception {
        String[] invalid = {
            "{\"policyCode\":\"lower\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"BOOLEAN\",\"value\":true}",
            "{\"policyCode\":\"A\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"BOOLEAN\",\"value\":true}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"\",\"category\":\"c\",\"valueType\":\"BOOLEAN\",\"value\":true}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\" \",\"valueType\":\"BOOLEAN\",\"value\":true}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"SQL\",\"value\":\"select 1\"}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"BOOLEAN\"}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"BOOLEAN\",\"value\":null}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"BOOLEAN\",\"value\":\"false\"}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"NUMBER\",\"value\":\"1\"}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"NUMBER\",\"value\":11,\"minValue\":0,\"maxValue\":10}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"NUMBER\",\"value\":-1,\"minValue\":0}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"NUMBER\",\"value\":5,\"minValue\":10,\"maxValue\":1}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"NUMBER\",\"value\":1e400}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"SELECT\",\"value\":\"A\",\"options\":[]}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"SELECT\",\"value\":\"A\","
                    + "\"options\":[{\"value\":\"A\",\"label\":\"a\"},{\"value\":\"A\",\"label\":\"b\"}]}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"SELECT\",\"value\":\"Z\","
                    + "\"options\":[{\"value\":\"A\",\"label\":\"a\"}]}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"SELECT\",\"value\":\"A\","
                    + "\"options\":[{\"value\":\"A\",\"label\":\"\"}]}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"DATE\",\"value\":\"2026-02-30\"}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"DATE\",\"value\":\"2026/01/01\"}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"DATE\",\"value\":\"2026-01-01T00:00:00\"}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"TEXT\",\"value\":\"" + repeat('a', 2001) + "\"}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"USER_LIST\",\"value\":[0]}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"USER_LIST\",\"value\":[1,1]}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"USER_LIST\",\"value\":[1.5]}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"USER_LIST\",\"value\":\"1\"}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"USER_LIST\",\"value\":" + idList(101) + "}",
            "{\"policyCode\":\"DELIVERY_PLAN_MODE\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"SELECT\",\"value\":\"AUTO\","
                    + "\"options\":[{\"value\":\"AUTO\",\"label\":\"a\"}]}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"" + repeat('n', 101) + "\",\"category\":\"c\",\"valueType\":\"BOOLEAN\",\"value\":true}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"" + repeat('c', 81) + "\",\"valueType\":\"BOOLEAN\",\"value\":true}",
            "{\"policyCode\":\"OK_CODE\",\"policyName\":\"x\",\"category\":\"c\",\"description\":\"" + repeat('d', 1001) + "\",\"valueType\":\"BOOLEAN\",\"value\":true}"
        };
        for (String json : invalid) {
            assertThatThrownBy(() -> service.createPolicy(TENANT, ACTOR, request(json)))
                    .as(json.length() > 120 ? json.substring(0, 120) : json)
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        }
        verify(dao, never()).insertPolicy(anyMap());
        verify(dao, never()).insertPolicyHistory(anyMap());
    }

    @Test
    void createRejectsUserIdsOutsideCurrentTenantOrInactive() throws Exception {
        when(dao.countActiveUsersByIds(anyMap())).thenReturn(1);

        assertThatThrownBy(() -> service.createPolicy(TENANT, ACTOR, request("{\"policyCode\":\"APPROVERS\","
                + "\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"USER_LIST\",\"value\":[7,8]}")))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(dao).countActiveUsersByIds(argThat(params -> TENANT.equals(params.get("tenantId"))
                && listOf(7L, 8L).equals(params.get("userIds"))));
        verify(dao, never()).insertPolicy(anyMap());
    }

    @Test
    void createRejectsDuplicateCodeWithConflictIncludingConcurrentInsertRace() throws Exception {
        when(dao.selectPolicyIdByCode(anyMap())).thenReturn(3L);
        assertConflict(() -> service.createPolicy(TENANT, ACTOR, request(textBody("DUP"))));

        when(dao.selectPolicyIdByCode(anyMap())).thenReturn(null);
        when(dao.insertPolicy(anyMap())).thenThrow(new DuplicateKeyException("uq"));
        assertConflict(() -> service.createPolicy(TENANT, ACTOR, request(textBody("DUP"))));
        verify(dao, never()).insertPolicyHistory(anyMap());
    }

    @Test
    void updateRejectsStaleVersionBeforeWriting() throws Exception {
        when(dao.selectPolicyByIdForUpdate(anyMap())).thenReturn(stored(5L, "MEMO", "TEXT", "\"a\"", "[]", false, 3));

        assertConflict(() -> service.updatePolicy(TENANT, ACTOR, 5L, request(textUpdate("MEMO", 2))));
        verify(dao, never()).updatePolicy(anyMap());
        verify(dao, never()).insertPolicyHistory(anyMap());
    }

    @Test
    void updateRequiresVersionAndRejectsCodeOrTypeChanges() throws Exception {
        when(dao.selectPolicyByIdForUpdate(anyMap())).thenReturn(stored(5L, "MEMO", "TEXT", "\"a\"", "[]", false, 3));

        assertBadRequest(() -> service.updatePolicy(TENANT, ACTOR, 5L, request(
                "{\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"TEXT\",\"value\":\"b\"}")));
        assertBadRequest(() -> service.updatePolicy(TENANT, ACTOR, 5L, request(textUpdate("OTHER", 3))));
        assertBadRequest(() -> service.updatePolicy(TENANT, ACTOR, 5L, request(
                "{\"policyCode\":\"MEMO\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"NUMBER\",\"value\":1,\"version\":3}")));
        verify(dao, never()).updatePolicy(anyMap());
    }

    @Test
    void updateMissingPolicyReturnsNotFoundAndConcurrentVersionLossReturnsConflict() throws Exception {
        assertThatThrownBy(() -> service.updatePolicy(TENANT, ACTOR, 5L, request(textUpdate("MEMO", 3))))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        when(dao.selectPolicyByIdForUpdate(anyMap())).thenReturn(stored(5L, "MEMO", "TEXT", "\"a\"", "[]", false, 3));
        when(dao.updatePolicy(anyMap())).thenReturn(0);
        assertConflict(() -> service.updatePolicy(TENANT, ACTOR, 5L, request(textUpdate("MEMO", 3))));
        verify(dao, never()).insertPolicyHistory(anyMap());
    }

    @Test
    void updateCustomPolicyWritesVersionedRowAndBeforeAfterHistoryInSameFlow() throws Exception {
        when(dao.selectPolicyByIdForUpdate(anyMap())).thenReturn(stored(5L, "MEMO", "TEXT", "\"a\"", "[]", false, 3));
        when(dao.updatePolicy(anyMap())).thenReturn(1);
        when(dao.selectPolicyById(anyMap())).thenReturn(stored(5L, "MEMO", "TEXT", "\"\"", "[]", false, 4));

        SystemPolicyVO result = service.updatePolicy(TENANT, ACTOR, 5L, request(
                "{\"policyCode\":\"MEMO\",\"policyName\":\"메모\",\"category\":\"c\",\"valueType\":\"TEXT\",\"value\":\"\",\"version\":3}"));

        InOrder order = inOrder(dao);
        order.verify(dao).selectPolicyByIdForUpdate(argThat(p -> TENANT.equals(p.get("tenantId")) && Long.valueOf(5L).equals(p.get("policyId"))));
        order.verify(dao).updatePolicy(argThat(p -> Integer.valueOf(3).equals(p.get("version"))
                && "\"\"".equals(p.get("valueJson")) && TENANT.equals(p.get("tenantId")) && ACTOR.equals(p.get("actorId"))));
        order.verify(dao).insertPolicyHistory(argThat(p -> "UPDATE".equals(p.get("action"))
                && "\"a\"".equals(p.get("beforeValueJson")) && "\"\"".equals(p.get("afterValueJson"))
                && ACTOR.equals(p.get("actorId")) && TENANT.equals(p.get("tenantId"))));
        assertThat(result.getVersion()).isEqualTo(4);
        verify(dao, never()).updateTenantDeliveryPlanMode(anyMap());
        verify(dao, never()).updateTenantOverDeliveryPolicy(anyMap());
    }

    @Test
    void systemPolicyRejectsOptionAndConstraintEditsAndValuesOutsideEnum() throws Exception {
        when(dao.selectPolicyByIdForUpdate(anyMap())).thenReturn(
                stored(4L, "OVER_DELIVERY_POLICY", "SELECT", "\"BLOCK\"", OVER_OPTIONS, true, 1));
        when(dao.selectTenantPolicyValuesForUpdate(TENANT)).thenReturn(tenantValues("AUTO", "BLOCK"));

        assertBadRequest(() -> service.updatePolicy(TENANT, ACTOR, 4L, request(overUpdate("WARN",
                "[{\"value\":\"BLOCK\",\"label\":\"차단\"},{\"value\":\"WARN\",\"label\":\"경고\"},{\"value\":\"ALLOW\",\"label\":\"허용\"}]"))));
        assertBadRequest(() -> service.updatePolicy(TENANT, ACTOR, 4L, request(
                "{\"policyCode\":\"OVER_DELIVERY_POLICY\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"SELECT\","
                        + "\"value\":\"WARN\",\"minValue\":1,\"version\":1}")));
        assertBadRequest(() -> service.updatePolicy(TENANT, ACTOR, 4L, request(overUpdate("ALLOW", null))));
        verify(dao, never()).updatePolicy(anyMap());
        verify(dao, never()).updateTenantOverDeliveryPolicy(anyMap());
    }

    @Test
    void systemPolicyKeepsStoredMetadataAndRejectsNameCategoryOrDescriptionEdits() throws Exception {
        when(dao.selectPolicyByIdForUpdate(anyMap())).thenReturn(
                stored(4L, "OVER_DELIVERY_POLICY", "SELECT", "\"BLOCK\"", OVER_OPTIONS, true, 1));
        when(dao.selectTenantPolicyValuesForUpdate(TENANT)).thenReturn(tenantValues("AUTO", "BLOCK"));
        String prefix = "{\"policyCode\":\"OVER_DELIVERY_POLICY\",\"valueType\":\"SELECT\",\"value\":\"WARN\",\"version\":1,";

        assertBadRequest(() -> service.updatePolicy(TENANT, ACTOR, 4L, request(prefix
                + "\"policyName\":\"renamed\",\"category\":\"c\",\"description\":\"\"}")));
        assertBadRequest(() -> service.updatePolicy(TENANT, ACTOR, 4L, request(prefix
                + "\"policyName\":\"OVER_DELIVERY_POLICY\",\"category\":\"moved\",\"description\":\"\"}")));
        assertBadRequest(() -> service.updatePolicy(TENANT, ACTOR, 4L, request(prefix
                + "\"policyName\":\"OVER_DELIVERY_POLICY\",\"category\":\"c\",\"description\":\"changed\"}")));
        verify(dao, never()).updateTenantOverDeliveryPolicy(anyMap());
        verify(dao, never()).updatePolicy(anyMap());

        when(dao.updateTenantOverDeliveryPolicy(anyMap())).thenReturn(1);
        when(dao.updatePolicy(anyMap())).thenReturn(1);
        service.updatePolicy(TENANT, ACTOR, 4L, request(prefix.substring(0, prefix.length() - 1) + "}"));
        verify(dao).updatePolicy(argThat(p -> "OVER_DELIVERY_POLICY".equals(p.get("policyName"))
                && "c".equals(p.get("category")) && "".equals(p.get("description"))
                && "\"WARN\"".equals(p.get("valueJson"))));
    }

    @Test
    void overDeliveryWarnToBlockUpdatesOnlyTenantColumnPolicyMirrorAndHistory() throws Exception {        when(dao.selectPolicyByIdForUpdate(anyMap())).thenReturn(
                stored(4L, "OVER_DELIVERY_POLICY", "SELECT", "\"BLOCK\"", OVER_OPTIONS, true, 1));
        when(dao.selectTenantPolicyValuesForUpdate(TENANT)).thenReturn(tenantValues("AUTO", "WARN"));
        when(dao.updateTenantOverDeliveryPolicy(anyMap())).thenReturn(1);
        when(dao.updatePolicy(anyMap())).thenReturn(1);
        when(dao.selectPolicyById(anyMap())).thenReturn(
                stored(4L, "OVER_DELIVERY_POLICY", "SELECT", "\"BLOCK\"", OVER_OPTIONS, true, 2));

        service.updatePolicy(TENANT, ACTOR, 4L, request(overUpdate("BLOCK", OVER_OPTIONS)));

        InOrder order = inOrder(dao);
        order.verify(dao).selectPolicyByIdForUpdate(anyMap());
        order.verify(dao).selectTenantPolicyValuesForUpdate(TENANT);
        order.verify(dao).updateTenantOverDeliveryPolicy(argThat(p -> "BLOCK".equals(p.get("value")) && TENANT.equals(p.get("tenantId"))));
        order.verify(dao).updatePolicy(argThat(p -> "\"BLOCK\"".equals(p.get("valueJson"))
                && OVER_OPTIONS.equals(p.get("optionsJson"))));
        order.verify(dao).insertPolicyHistory(argThat(p -> "\"WARN\"".equals(p.get("beforeValueJson"))
                && "\"BLOCK\"".equals(p.get("afterValueJson"))));
        verify(dao, never()).existsDeliveryPlanHeader(anyLong());
        verify(dao, never()).updateTenantDeliveryPlanMode(anyMap());
    }

    @Test
    void deliveryPlanModeChangeIsRejectedWhenPlansExistAndAllowedOtherwise() throws Exception {
        when(dao.selectPolicyByIdForUpdate(anyMap())).thenReturn(
                stored(3L, "DELIVERY_PLAN_MODE", "SELECT", "\"AUTO\"", MODE_OPTIONS, true, 1));
        when(dao.selectTenantPolicyValuesForUpdate(TENANT)).thenReturn(tenantValues("AUTO", "BLOCK"));
        when(dao.existsDeliveryPlanHeader(TENANT)).thenReturn(true);

        assertConflict(() -> service.updatePolicy(TENANT, ACTOR, 3L, request(modeUpdate("MANUAL"))));
        verify(dao, never()).updateTenantDeliveryPlanMode(anyMap());
        verify(dao, never()).updatePolicy(anyMap());
        verify(dao, never()).insertPolicyHistory(anyMap());

        when(dao.existsDeliveryPlanHeader(TENANT)).thenReturn(false);
        when(dao.updateTenantDeliveryPlanMode(anyMap())).thenReturn(1);
        when(dao.updatePolicy(anyMap())).thenReturn(1);
        when(dao.selectPolicyById(anyMap())).thenReturn(
                stored(3L, "DELIVERY_PLAN_MODE", "SELECT", "\"MANUAL\"", MODE_OPTIONS, true, 2));
        service.updatePolicy(TENANT, ACTOR, 3L, request(modeUpdate("MANUAL")));
        verify(dao).updateTenantDeliveryPlanMode(argThat(p -> "MANUAL".equals(p.get("value")) && TENANT.equals(p.get("tenantId"))));
    }

    @Test
    void unchangedDeliveryPlanModeDoesNotRequirePlanCheck() throws Exception {
        when(dao.selectPolicyByIdForUpdate(anyMap())).thenReturn(
                stored(3L, "DELIVERY_PLAN_MODE", "SELECT", "\"AUTO\"", MODE_OPTIONS, true, 1));
        when(dao.selectTenantPolicyValuesForUpdate(TENANT)).thenReturn(tenantValues("MANUAL", "BLOCK"));
        when(dao.updateTenantDeliveryPlanMode(anyMap())).thenReturn(1);
        when(dao.updatePolicy(anyMap())).thenReturn(1);
        when(dao.selectPolicyById(anyMap())).thenReturn(
                stored(3L, "DELIVERY_PLAN_MODE", "SELECT", "\"MANUAL\"", MODE_OPTIONS, true, 2));

        service.updatePolicy(TENANT, ACTOR, 3L, request(modeUpdate("MANUAL")));

        verify(dao, never()).existsDeliveryPlanHeader(anyLong());
        verify(dao).insertPolicyHistory(argThat(p -> "\"MANUAL\"".equals(p.get("beforeValueJson"))));
    }

    @Test
    void deleteProtectsSystemPoliciesAndStaleVersions() throws Exception {
        when(dao.selectPolicyByIdForUpdate(anyMap())).thenReturn(
                stored(3L, "DELIVERY_PLAN_MODE", "SELECT", "\"AUTO\"", MODE_OPTIONS, true, 1));
        assertBadRequest(() -> service.deletePolicy(TENANT, ACTOR, 3L, 1));

        when(dao.selectPolicyByIdForUpdate(anyMap())).thenReturn(stored(5L, "MEMO", "TEXT", "\"a\"", "[]", false, 3));
        assertConflict(() -> service.deletePolicy(TENANT, ACTOR, 5L, 2));
        assertBadRequest(() -> service.deletePolicy(TENANT, ACTOR, 5L, null));
        verify(dao, never()).deletePolicy(anyMap());
        verify(dao, never()).insertPolicyHistory(anyMap());
    }

    @Test
    void deleteWritesHistorySnapshotBeforeVersionedDelete() throws Exception {
        when(dao.selectPolicyByIdForUpdate(anyMap())).thenReturn(stored(5L, "MEMO", "TEXT", "\"a\"", "[]", false, 3));
        when(dao.deletePolicy(anyMap())).thenReturn(1);

        service.deletePolicy(TENANT, ACTOR, 5L, 3);

        InOrder order = inOrder(dao);
        order.verify(dao).selectPolicyByIdForUpdate(anyMap());
        order.verify(dao).insertPolicyHistory(argThat(p -> "DELETE".equals(p.get("action"))
                && "\"a\"".equals(p.get("beforeValueJson")) && p.get("afterValueJson") == null
                && p.get("afterSnapshotJson") == null && ((String) p.get("beforeSnapshotJson")).contains("\"MEMO\"")));
        order.verify(dao).deletePolicy(argThat(p -> Integer.valueOf(3).equals(p.get("version"))
                && TENANT.equals(p.get("tenantId")) && Long.valueOf(5L).equals(p.get("policyId"))));
    }

    @Test
    void userSearchEscapesLikeWildcardsAndHistoryIsTenantScoped() throws Exception {
        service.searchUsers(TENANT, " 50%_kim\\ ");
        verify(dao).selectActiveUsers(argThat(p -> TENANT.equals(p.get("tenantId"))
                && "50\\%\\_kim\\\\".equals(p.get("keyword"))));

        service.listHistory(TENANT, 5L);
        verify(dao).selectPolicyHistoryList(argThat(p -> TENANT.equals(p.get("tenantId"))
                && Long.valueOf(5L).equals(p.get("policyId"))));
    }

    private void assertConflict(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call).isInstanceOfSatisfying(ResponseStatusException.class,
                ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT));
    }

    private void assertBadRequest(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call).isInstanceOfSatisfying(ResponseStatusException.class,
                ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    private String textBody(String code) {
        return "{\"policyCode\":\"" + code + "\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"TEXT\",\"value\":\"v\"}";
    }

    private String textUpdate(String code, int version) {
        return "{\"policyCode\":\"" + code + "\",\"policyName\":\"x\",\"category\":\"c\",\"valueType\":\"TEXT\","
                + "\"value\":\"b\",\"version\":" + version + "}";
    }

    private String overUpdate(String value, String options) {
        return "{\"policyCode\":\"OVER_DELIVERY_POLICY\",\"policyName\":\"OVER_DELIVERY_POLICY\",\"category\":\"c\","
                + "\"valueType\":\"SELECT\",\"value\":\"" + value + "\","
                + (options == null ? "" : "\"options\":" + options + ",") + "\"version\":1}";
    }

    private String modeUpdate(String value) {
        return "{\"policyCode\":\"DELIVERY_PLAN_MODE\",\"policyName\":\"DELIVERY_PLAN_MODE\",\"category\":\"c\","
                + "\"valueType\":\"SELECT\",\"value\":\"" + value + "\",\"options\":" + MODE_OPTIONS + ",\"version\":1}";
    }

    private SystemPolicySaveRequestVO request(String json) throws Exception {
        return objectMapper.readValue(json, SystemPolicySaveRequestVO.class);
    }

    private SystemPolicyVO stored(Long id, String code, String type, String valueJson, String optionsJson,
            boolean system, int version) {
        SystemPolicyVO vo = new SystemPolicyVO();
        vo.setPolicyId(id);
        vo.setPolicyCode(code);
        vo.setPolicyName(code);
        vo.setCategory("c");
        vo.setDescription("");
        vo.setValueType(type);
        vo.setValueJson(valueJson);
        vo.setOptionsJson(optionsJson);
        vo.setUnit("");
        vo.setVersion(version);
        vo.setSystemPolicy(system);
        vo.setUpdatedAt("2026-11-05T10:00:00");
        return vo;
    }

    private SystemPolicyTenantValueVO tenantValues(String mode, String over) {
        SystemPolicyTenantValueVO vo = new SystemPolicyTenantValueVO();
        vo.setDeliveryPlanMode(mode);
        vo.setOverDeliveryPolicy(over);
        return vo;
    }

    @SuppressWarnings("unchecked")
    private ArgumentCaptor<Map<String, Object>> mapCaptor() {
        return ArgumentCaptor.forClass((Class<Map<String, Object>>) (Class<?>) Map.class);
    }

    @SafeVarargs
    private static <T> List<T> listOf(T... values) {
        List<T> list = new ArrayList<>();
        for (T value : values) {
            list.add(value);
        }
        return list;
    }

    private static String repeat(char ch, int count) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < count; i++) {
            sb.append(ch);
        }
        return sb.toString();
    }

    private static String idList(int count) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 1; i <= count; i++) {
            sb.append(i == 1 ? "" : ",").append(i);
        }
        return sb.append(']').toString();
    }
}