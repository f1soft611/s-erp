package egovframework.let.hr.employee.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Base64;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.hr.common.ResidentNumberCipher;
import egovframework.let.hr.employee.domain.model.EmployeeSaveRequestVO;
import egovframework.let.hr.employee.domain.model.EmployeeVO;
import egovframework.let.hr.employee.domain.repository.EmployeeDAO;
import egovframework.let.utl.sim.service.EgovFileScrty;

class EmployeeServiceImplTest {

    private static final Long TENANT = 1L;
    private static final Long ADMIN = 9L;

    @Mock
    private EmployeeDAO employeeDAO;
    @Mock
    private IdSequenceService idSequenceService;
    @Mock
    private egovframework.let.hr.order.service.HrOrderHistoryRecorder historyRecorder;

    private ResidentNumberCipher cipher;
    private EmployeeServiceImpl service;

    private static String key() {
        byte[] bytes = new byte[32];
        Arrays.fill(bytes, (byte) 5);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        cipher = new ResidentNumberCipher(key(), "v1");
        service = new EmployeeServiceImpl(employeeDAO, idSequenceService, cipher, historyRecorder);
        when(employeeDAO.existsActiveDepartment(anyMap())).thenReturn(true);
        when(employeeDAO.existsCommonCodeItem(anyMap())).thenReturn(true);
        when(employeeDAO.existsLevel(anyMap())).thenReturn(true);
        when(employeeDAO.insertEmployee(anyMap())).thenReturn(100L);
        when(employeeDAO.updateEmployee(anyMap())).thenReturn(1);
        when(employeeDAO.insertLoginAccount(anyMap())).thenReturn(55L);
        when(employeeDAO.insertDefaultRole(anyMap())).thenReturn(1);
        when(idSequenceService.nextValue(anyString(), anyString(), anyString())).thenReturn(1L);
        when(employeeDAO.selectEmployeeById(anyMap())).thenReturn(employee(100L));
    }

    private static EmployeeVO employee(Long userId) {
        EmployeeVO vo = new EmployeeVO();
        vo.setUserId(userId);
        vo.setEmployeeNo("261101");
        vo.setUserNm("홍길동");
        vo.setRealUserAt("N");
        return vo;
    }

    private static EmployeeSaveRequestVO payload() {
        EmployeeSaveRequestVO vo = new EmployeeSaveRequestVO();
        vo.setUserNm("  홍길동  ");
        vo.setDepartmentId(3L);
        vo.setPositionCode("STAFF");
        vo.setEmploymentTypeCode("REGULAR");
        vo.setJoinDt("2026-11-05");
        return vo;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> captureInsert() throws Exception {
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(employeeDAO).insertEmployee(captor.capture());
        return captor.getValue();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> captureUpdate() throws Exception {
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(employeeDAO).updateEmployee(captor.capture());
        return captor.getValue();
    }

    private static void assertConflict(Throwable error) {
        assertThat(error).isInstanceOfSatisfying(ResponseStatusException.class,
                ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT));
    }

    // ---- 인사명령 이력 연동 ----

    @Test
    void creatingAnEmployeeRecordsAJoinHistoryInTheSameService() throws Exception {
        service.createEmployee(TENANT, ADMIN, payload());

        org.mockito.Mockito.verify(historyRecorder).recordJoin(org.mockito.ArgumentMatchers.eq(TENANT),
                org.mockito.ArgumentMatchers.eq(ADMIN), org.mockito.ArgumentMatchers.any(EmployeeVO.class));
    }

    @Test
    void aDirectEditRecordsTheChangeAndTheOrderPathCanSkipIt() throws Exception {
        EmployeeVO existing = employee(100L);
        existing.setDepartmentId(3L);
        existing.setJoinDt("2026-11-05");
        when(employeeDAO.selectEmployeeById(anyMap())).thenReturn(existing);

        service.updateEmployee(TENANT, ADMIN, 100L, payload());
        org.mockito.Mockito.verify(historyRecorder).recordDirectEdit(TENANT, ADMIN, existing, existing);

        org.mockito.Mockito.clearInvocations(historyRecorder);
        service.updateEmployee(TENANT, ADMIN, 100L, payload(), false);
        org.mockito.Mockito.verify(historyRecorder, org.mockito.Mockito.never())
                .recordDirectEdit(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    // ---- 사번 ----

    @Test
    void autoNumbersFromTheJoinMonthWithATwoDigitSequence() throws Exception {
        service.createEmployee(TENANT, ADMIN, payload());

        Map<String, Object> params = captureInsert();
        assertThat(params).containsEntry("employeeNo", "261101").containsEntry("userNm", "홍길동")
                .containsEntry("tenantId", TENANT).containsEntry("createdBy", ADMIN).containsEntry("realUserAt", "N");
        verify(idSequenceService).nextValue("HR_EMPLOYEE_NO", "1", "2611");
    }

    @Test
    void sequenceBeyondNinetyNineGrowsToThreeDigitsAndUsedNumbersAreSkipped() throws Exception {
        when(idSequenceService.nextValue(anyString(), anyString(), anyString())).thenReturn(7L, 100L);
        when(employeeDAO.countEmployeeNo(anyMap())).thenReturn(1, 0);

        service.createEmployee(TENANT, ADMIN, payload());

        assertThat(captureInsert()).containsEntry("employeeNo", "2611100");
    }

    @Test
    void manualEmployeeNoIsUsedAsIsAfterFormatAndDuplicateChecks() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setEmployeeNo(" A-1 ");
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("사번");
        request.setEmployeeNo("19940101");
        when(employeeDAO.countEmployeeNo(anyMap())).thenReturn(1);
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, request))
                .satisfies(EmployeeServiceImplTest::assertConflict);
        verify(employeeDAO, never()).insertEmployee(anyMap());

        when(employeeDAO.countEmployeeNo(anyMap())).thenReturn(0);
        service.createEmployee(TENANT, ADMIN, request);
        assertThat(captureInsert()).containsEntry("employeeNo", "19940101");
        verify(idSequenceService, never()).nextValue(anyString(), anyString(), anyString());
    }

    @Test
    void employeeNoAvailabilityExcludesTheEmployeeBeingEdited() throws Exception {
        when(employeeDAO.countEmployeeNo(anyMap())).thenReturn(0);
        assertThat(service.isEmployeeNoAvailable(TENANT, "261101", 100L)).isTrue();
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(employeeDAO).countEmployeeNo(captor.capture());
        assertThat(captor.getValue()).containsEntry("excludeUserId", 100L).containsEntry("employeeNo", "261101");

        when(employeeDAO.countEmployeeNo(anyMap())).thenReturn(1);
        assertThat(service.isEmployeeNoAvailable(TENANT, "261101", null)).isFalse();
    }

    // ---- 필수·코드·날짜 ----

    @Test
    void requiresNameDepartmentPositionAndJoinDate() throws Exception {
        for (int field = 0; field < 4; field++) {
            EmployeeSaveRequestVO request = payload();
            if (field == 0) request.setUserNm("   ");
            if (field == 1) request.setDepartmentId(null);
            if (field == 2) request.setPositionCode(null);
            if (field == 3) request.setJoinDt(null);
            assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, request))
                    .isInstanceOf(IllegalArgumentException.class);
        }
        verify(employeeDAO, never()).insertEmployee(anyMap());
    }

    @Test
    void employmentTypeIsOptionalAndSavedAsNullWhenBlank() throws Exception {
        for (String blank : new String[] {null, "", "   "}) {
            org.mockito.Mockito.clearInvocations(employeeDAO);
            EmployeeSaveRequestVO request = payload();
            request.setEmploymentTypeCode(blank);

            service.createEmployee(TENANT, ADMIN, request);

            org.assertj.core.api.Assertions.assertThat(captureInsert().get("employmentTypeCode")).as(String.valueOf(blank)).isNull();
        }
    }

    @Test
    void rejectsInactiveDepartmentAndUnknownCommonCodes() throws Exception {
        when(employeeDAO.existsActiveDepartment(anyMap())).thenReturn(false);
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, payload()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("부서");

        when(employeeDAO.existsActiveDepartment(anyMap())).thenReturn(true);
        when(employeeDAO.existsCommonCodeItem(anyMap())).thenReturn(false);
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, payload()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("직위");

        when(employeeDAO.existsCommonCodeItem(anyMap())).thenReturn(true);
        when(employeeDAO.existsLevel(anyMap())).thenReturn(false);
        EmployeeSaveRequestVO request = payload();
        request.setLevelId(77L);
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("직급");
        verify(employeeDAO, never()).insertEmployee(anyMap());
    }

    @Test
    void validatesDateFormatAndOrder() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setJoinDt("2026/11/05");
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("입사일");

        EmployeeSaveRequestVO retire = payload();
        retire.setRetireDt("2026-11-04");
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, retire))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("퇴사일");

        EmployeeSaveRequestVO leave = payload();
        leave.setSuspendDt("2026-11-10");
        leave.setBackDt("2026-11-09");
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, leave))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("복직일");
        verify(employeeDAO, never()).insertEmployee(anyMap());
    }

    @Test
    void validatesEmailFormatAndDuplicates() throws Exception {
        EmployeeSaveRequestVO bad = payload();
        bad.setEmailAddr("not-an-email");
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, bad))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("이메일");

        EmployeeSaveRequestVO dup = payload();
        dup.setEmailAddr("hong@example.com");
        when(employeeDAO.countEmail(anyMap())).thenReturn(1);
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, dup))
                .satisfies(EmployeeServiceImplTest::assertConflict);
        verify(employeeDAO, never()).insertEmployee(anyMap());
    }

    // ---- 주민등록번호 ----

    @Test
    void storesOnlyCiphertextHashAndMaskedResidentNumber() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setResidentNo("900101-1234567");

        service.createEmployee(TENANT, ADMIN, request);

        Map<String, Object> params = captureInsert();
        assertThat(params).containsEntry("residentNoMasked", "900101-1******")
                .containsEntry("residentNoKeyVersion", "v1").containsEntry("residentNoHash", cipher.hash("9001011234567"));
        assertThat(cipher.decrypt("v1", (byte[]) params.get("residentNoEnc"))).isEqualTo("9001011234567");
        assertThat(params.values().toString()).doesNotContain("9001011234567").doesNotContain("1234567");
    }

    @Test
    void rejectsMalformedAndDuplicateResidentNumbers() throws Exception {
        EmployeeSaveRequestVO malformed = payload();
        malformed.setResidentNo("123");
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, malformed))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("주민등록번호");

        EmployeeSaveRequestVO dup = payload();
        dup.setResidentNo("9001011234567");
        when(employeeDAO.countResidentHash(anyMap())).thenReturn(1);
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, dup))
                .satisfies(EmployeeServiceImplTest::assertConflict);
        verify(employeeDAO, never()).insertEmployee(anyMap());
    }

    @Test
    void residentNumberIsBlockedWithServiceUnavailableWhenTheKeyIsMissingButOtherSavesStillWork() throws Exception {
        service = new EmployeeServiceImpl(employeeDAO, idSequenceService, new ResidentNumberCipher("", ""), historyRecorder);
        EmployeeSaveRequestVO withResidentNo = payload();
        withResidentNo.setResidentNo("9001011234567");

        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, withResidentNo))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
        verify(employeeDAO, never()).insertEmployee(anyMap());

        service.createEmployee(TENANT, ADMIN, payload());
        assertThat(captureInsert()).doesNotContainKey("residentNoEnc");
    }

    // ---- 실사용자·계정 ----

    @Test
    void issuesLoginAccountWithDefaultRoleAndLinksItWhenRealUser() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setRealUserAt("Y");
        request.setLoginCode("hong.gd");
        request.setInitialPassword("Init-pass1");
        request.setPhotoImage("data:image/jpeg;base64,AAAA");

        service.createEmployee(TENANT, ADMIN, request);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> account = ArgumentCaptor.forClass(Map.class);
        verify(employeeDAO).insertLoginAccount(account.capture());
        assertThat(account.getValue()).containsEntry("loginCode", "hong.gd")
                .containsEntry("passwordHash", EgovFileScrty.encryptPassword("Init-pass1", "hong.gd"))
                .containsEntry("profileImage", "data:image/jpeg;base64,AAAA");
        assertThat(account.getValue().values().toString()).doesNotContain("Init-pass1");
        verify(employeeDAO).insertDefaultRole(anyMap());
        assertThat(captureInsert()).containsEntry("loginId", 55L).containsEntry("realUserAt", "Y")
                .containsEntry("photoImage", "data:image/jpeg;base64,AAAA");
    }

    @Test
    void realUserNeedsAValidUniqueLoginCodeAndPassword() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setRealUserAt("Y");
        request.setLoginCode("ab");
        request.setInitialPassword("Init-pass1");
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("로그인 아이디");

        request.setLoginCode("hong.gd");
        request.setInitialPassword("short");
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("8자");

        request.setInitialPassword("Init-pass1");
        when(employeeDAO.countLoginCode(anyMap())).thenReturn(1);
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, request))
                .satisfies(EmployeeServiceImplTest::assertConflict);
        verify(employeeDAO, never()).insertLoginAccount(anyMap());
        verify(employeeDAO, never()).insertEmployee(anyMap());
    }

    @Test
    void blankLoginCodeFallsBackToTheEmployeeNumber() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setRealUserAt("Y");
        request.setInitialPassword("Init-pass1");

        service.createEmployee(TENANT, ADMIN, request);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> account = ArgumentCaptor.forClass(Map.class);
        verify(employeeDAO).insertLoginAccount(account.capture());
        assertThat(account.getValue()).containsEntry("loginCode", "261101")
                .containsEntry("passwordHash", EgovFileScrty.encryptPassword("Init-pass1", "261101"));
    }

    @Test
    void blankLoginCodeUsesAManuallyEnteredEmployeeNumber() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setEmployeeNo("19940101");
        request.setRealUserAt("Y");
        request.setLoginCode("   ");
        request.setInitialPassword("Init-pass1");

        service.createEmployee(TENANT, ADMIN, request);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> account = ArgumentCaptor.forClass(Map.class);
        verify(employeeDAO).insertLoginAccount(account.capture());
        assertThat(account.getValue()).containsEntry("loginCode", "19940101");
    }

    @Test
    void employeeNumberTooShortForALoginCodeAsksForAnExplicitOne() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setEmployeeNo("A1");
        request.setRealUserAt("Y");
        request.setInitialPassword("Init-pass1");

        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("사번").hasMessageContaining("직접 입력");
        verify(employeeDAO, never()).insertLoginAccount(anyMap());
        verify(employeeDAO, never()).insertEmployee(anyMap());
    }

    @Test
    void employeeNumberAlreadyUsedAsAnotherLoginCodeIsAConflict() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setRealUserAt("Y");
        request.setInitialPassword("Init-pass1");
        when(employeeDAO.countLoginCode(anyMap())).thenReturn(1);

        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, request))
                .satisfies(EmployeeServiceImplTest::assertConflict);
        verify(employeeDAO, never()).insertEmployee(anyMap());
    }

    @Test
    void loginCodeAvailabilityValidatesTheFormatAndChecksDuplicates() throws Exception {
        when(employeeDAO.countLoginCode(anyMap())).thenReturn(0);
        assertThat(service.isLoginCodeAvailable(TENANT, " hong.gd ")).isTrue();
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(employeeDAO).countLoginCode(captor.capture());
        assertThat(captor.getValue()).containsEntry("tenantId", TENANT).containsEntry("loginCode", "hong.gd");

        when(employeeDAO.countLoginCode(anyMap())).thenReturn(1);
        assertThat(service.isLoginCodeAvailable(TENANT, "hong.gd")).isFalse();
        assertThatThrownBy(() -> service.isLoginCodeAvailable(TENANT, "a@b")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.isLoginCodeAvailable(TENANT, "  ")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void nonRealUserNeverCreatesAnAccountEvenIfCredentialsAreSent() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setRealUserAt("N");
        request.setLoginCode("hong.gd");
        request.setInitialPassword("Init-pass1");

        service.createEmployee(TENANT, ADMIN, request);

        verify(employeeDAO, never()).insertLoginAccount(anyMap());
        assertThat(captureInsert()).doesNotContainKey("loginId");
    }

    // ---- 수정 ----

    @Test
    void employeeNoCannotBeChangedAfterRegistration() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setEmployeeNo("999999");

        assertThatThrownBy(() -> service.updateEmployee(TENANT, ADMIN, 100L, request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("수정할 수 없습니다");
        verify(employeeDAO, never()).updateEmployee(anyMap());

        request.setEmployeeNo("261101");
        service.updateEmployee(TENANT, ADMIN, 100L, request);
        assertThat(captureUpdate()).containsEntry("employeeNo", "261101").containsEntry("userId", 100L)
                .containsEntry("updatedBy", ADMIN);
    }

    @Test
    void legacyEmployeeWithoutNumberGetsOneOnTheFirstSave() throws Exception {
        EmployeeVO legacy = employee(100L);
        legacy.setEmployeeNo(null);
        when(employeeDAO.selectEmployeeById(anyMap())).thenReturn(legacy);

        service.updateEmployee(TENANT, ADMIN, 100L, payload());

        assertThat(captureUpdate()).containsEntry("employeeNo", "261101");
    }

    @Test
    void blankResidentNumberKeepsTheStoredValueAndANewOneReplacesIt() throws Exception {
        service.updateEmployee(TENANT, ADMIN, 100L, payload());
        assertThat(captureUpdate()).containsEntry("residentNoProvided", false).doesNotContainKey("residentNoEnc");
    }

    @Test
    void newResidentNumberReplacesTheStoredOneAndIsCheckedForDuplicatesExcludingSelf() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setResidentNo("9001011234567");

        service.updateEmployee(TENANT, ADMIN, 100L, request);

        Map<String, Object> params = captureUpdate();
        assertThat(params).containsEntry("residentNoProvided", true).containsEntry("residentNoMasked", "900101-1******");
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> hashCheck = ArgumentCaptor.forClass(Map.class);
        verify(employeeDAO).countResidentHash(hashCheck.capture());
        assertThat(hashCheck.getValue()).containsEntry("excludeUserId", 100L);
    }

    @Test
    void emailDuplicateCheckExcludesTheEmployeeBeingEdited() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setEmailAddr("hong@example.com");

        service.updateEmployee(TENANT, ADMIN, 100L, request);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(employeeDAO).countEmail(captor.capture());
        assertThat(captor.getValue()).containsEntry("excludeUserId", 100L).containsEntry("emailAddr", "hong@example.com");
    }

    @Test
    void realUserCannotBeClearedWhileALoginAccountIsLinked() throws Exception {
        EmployeeVO linked = employee(100L);
        linked.setLoginId(55L);
        linked.setRealUserAt("Y");
        when(employeeDAO.selectEmployeeById(anyMap())).thenReturn(linked);
        EmployeeSaveRequestVO request = payload();
        request.setRealUserAt("N");

        assertThatThrownBy(() -> service.updateEmployee(TENANT, ADMIN, 100L, request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("실사용자를 해제");
        verify(employeeDAO, never()).updateEmployee(anyMap());
    }

    @Test
    void existingEmployeeWithoutAccountCanBeMadeARealUserWhichIssuesTheAccount() throws Exception {
        EmployeeSaveRequestVO request = payload();
        request.setRealUserAt("Y");
        request.setLoginCode("hong.gd");
        request.setInitialPassword("Init-pass1");

        service.updateEmployee(TENANT, ADMIN, 100L, request);

        verify(employeeDAO).insertLoginAccount(anyMap());
        assertThat(captureUpdate()).containsEntry("loginId", 55L).containsEntry("realUserAt", "Y");
    }

    @Test
    void linkedAccountIgnoresSentCredentialsAndGetsTheNewPhoto() throws Exception {
        EmployeeVO linked = employee(100L);
        linked.setLoginId(55L);
        linked.setRealUserAt("Y");
        when(employeeDAO.selectEmployeeById(anyMap())).thenReturn(linked);
        EmployeeSaveRequestVO request = payload();
        request.setRealUserAt("Y");
        request.setLoginCode("other");
        request.setInitialPassword("Another-pass1");
        request.setPhotoImage("data:image/png;base64,BBBB");

        service.updateEmployee(TENANT, ADMIN, 100L, request);

        verify(employeeDAO, never()).insertLoginAccount(anyMap());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> image = ArgumentCaptor.forClass(Map.class);
        verify(employeeDAO).updateLoginProfileImage(image.capture());
        assertThat(image.getValue()).containsEntry("loginId", 55L).containsEntry("profileImage", "data:image/png;base64,BBBB");
        assertThat(captureUpdate()).containsEntry("photoProvided", true).containsEntry("photoImage", "data:image/png;base64,BBBB");
    }

    @Test
    void photoIsLeftAloneWhenNotSentAndClearedWhenBlank() throws Exception {
        service.updateEmployee(TENANT, ADMIN, 100L, payload());
        assertThat(captureUpdate()).containsEntry("photoProvided", false);
    }

    @Test
    void photoMustBeASmallImageDataUrl() throws Exception {
        EmployeeSaveRequestVO notImage = payload();
        notImage.setPhotoImage("http://example.com/a.png");
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, notImage))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("사진");

        EmployeeSaveRequestVO tooBig = payload();
        StringBuilder big = new StringBuilder("data:image/jpeg;base64,");
        for (int i = 0; i < 700 * 1024 + 1; i++) {
            big.append('A');
        }
        tooBig.setPhotoImage(big.toString());
        assertThatThrownBy(() -> service.createEmployee(TENANT, ADMIN, tooBig))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("사진");
        verify(employeeDAO, never()).insertEmployee(anyMap());
    }

    @Test
    void updateOfAMissingEmployeeIsNotFound() throws Exception {
        when(employeeDAO.selectEmployeeById(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> service.updateEmployee(TENANT, ADMIN, 404L, payload()))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ---- 목록 ----

    @Test
    void listDefaultsToActiveAndRejectsUnknownStatus() throws Exception {
        service.listEmployees(TENANT, "  홍  ", null, null);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(employeeDAO).selectEmployeeList(captor.capture());
        assertThat(captor.getValue()).containsEntry("tenantId", TENANT).containsEntry("status", "ACTIVE")
                .containsEntry("keyword", "홍");
        assertThatThrownBy(() -> service.listEmployees(TENANT, null, "BOGUS", null))
                .isInstanceOf(IllegalArgumentException.class);
        service.listEmployees(TENANT, null, "retired", 3L);
        verify(employeeDAO).selectEmployeeList(org.mockito.ArgumentMatchers.argThat(
                (Map<String, Object> m) -> "RETIRED".equals(m.get("status")) && Long.valueOf(3L).equals(m.get("departmentId"))));
    }
}
