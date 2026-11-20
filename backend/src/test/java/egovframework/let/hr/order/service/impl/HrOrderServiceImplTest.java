package egovframework.let.hr.order.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.hr.employee.domain.model.EmployeeSaveRequestVO;
import egovframework.let.hr.employee.domain.model.EmployeeVO;
import egovframework.let.hr.employee.service.EmployeeService;
import egovframework.let.hr.order.domain.model.HrOrderChange;
import egovframework.let.hr.order.domain.model.HrOrderField;
import egovframework.let.hr.order.domain.model.HrOrderHistoryVO;
import egovframework.let.hr.order.domain.model.HrOrderProcessRequestVO;
import egovframework.let.hr.order.domain.model.HrOrderProcessResultVO;
import egovframework.let.hr.order.domain.model.HrOrderType;
import egovframework.let.hr.order.domain.repository.HrOrderDAO;
import egovframework.let.hr.order.service.HrOrderHistoryRecorder;

class HrOrderServiceImplTest {

    private static final Long TENANT = 1L;
    private static final Long ADMIN = 9L;
    private static final String TODAY = LocalDate.now().toString();

    @Mock
    private EmployeeService employeeService;
    @Mock
    private HrOrderHistoryRecorder recorder;
    @Mock
    private HrOrderDAO hrOrderDAO;

    private HrOrderServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new HrOrderServiceImpl(employeeService, recorder, hrOrderDAO);
        when(recorder.recordOrder(any(), any(), any(), any(), any(), anyList())).thenReturn(77L);
    }

    private static EmployeeVO employee(Long userId, String name, String status) {
        EmployeeVO vo = new EmployeeVO();
        vo.setUserId(userId);
        vo.setEmployeeNo("26110" + userId);
        vo.setUserNm(name);
        vo.setDepartmentId(5L);
        vo.setDepartmentNm("생산1팀");
        vo.setPositionCode("STAFF");
        vo.setPositionNm("사원");
        vo.setLevelId(7L);
        vo.setLevelNm("대리");
        vo.setEmploymentTypeCode("REGULAR");
        vo.setEmploymentTypeNm("정규");
        vo.setJoinDt("2026-01-05");
        vo.setRealUserAt("N");
        vo.setEmploymentStatus(status);
        return vo;
    }

    private static HrOrderProcessRequestVO request(String type, String orderDt, String... idAndValue) {
        HrOrderProcessRequestVO request = new HrOrderProcessRequestVO();
        request.setOrderType(type);
        request.setOrderDt(orderDt);
        for (int i = 0; i < idAndValue.length; i += 2) {
            HrOrderProcessRequestVO.Item item = new HrOrderProcessRequestVO.Item();
            item.setUserId(Long.valueOf(idAndValue[i]));
            item.setPostValue(idAndValue[i + 1]);
            request.getItems().add(item);
        }
        return request;
    }

    /** updateEmployee가 돌려줄 변경 후 사원: 부서를 8(경영지원팀)로 바꾼다. */
    private void stubTransfer(Long userId, EmployeeVO existing) throws Exception {
        when(employeeService.getEmployee(TENANT, userId)).thenReturn(existing);
        EmployeeVO after = employee(userId, existing.getUserNm(), "ACTIVE");
        after.setDepartmentId(8L);
        after.setDepartmentNm("경영지원팀");
        when(employeeService.updateEmployee(eq(TENANT), eq(ADMIN), eq(userId), any(EmployeeSaveRequestVO.class), eq(false)))
                .thenReturn(after);
    }

    @SuppressWarnings("unchecked")
    private List<HrOrderChange> capturedChanges() throws Exception {
        ArgumentCaptor<List<HrOrderChange>> captor = ArgumentCaptor.forClass(List.class);
        verify(recorder).recordOrder(eq(TENANT), eq(ADMIN), any(HrOrderType.class), any(LocalDate.class), any(), captor.capture());
        return captor.getValue();
    }

    @Test
    void listsOnlyTheTypesAScreenCanSelect() {
        assertThat(service.listTypes()).extracting("code").containsExactly(
                "TRANSFER", "PROMOTION", "GRADE_UP", "EMPLOYMENT_TYPE_CHANGE", "LEAVE", "RETURN", "RETIRE");
        assertThat(service.listTypes().get(0).getInputKind()).isEqualTo("department");
        assertThat(service.listTypes().get(1).getCodeGroup()).isEqualTo("POSITION");
    }

    @Test
    void transfersSeveralEmployeesInOneOrderAndRecordsBeforeAndAfter() throws Exception {
        stubTransfer(1L, employee(1L, "홍길동", "ACTIVE"));
        stubTransfer(2L, employee(2L, "김철수", "ACTIVE"));

        HrOrderProcessResultVO result = service.process(TENANT, ADMIN, request("TRANSFER", TODAY, "1", "8", "2", "8"));

        assertThat(result.getOrderId()).isEqualTo(77L);
        assertThat(result.getCount()).isEqualTo(2);
        assertThat(result.getItems()).extracting("userNm").containsExactly("홍길동", "김철수");
        assertThat(result.getItems().get(0).getPreName()).isEqualTo("생산1팀");
        assertThat(result.getItems().get(0).getPostName()).isEqualTo("경영지원팀");
        List<HrOrderChange> changes = capturedChanges();
        assertThat(changes).hasSize(2);
        HrOrderChange.Field field = changes.get(0).getFields().get(0);
        assertThat(field.getField()).isEqualTo(HrOrderField.DEPARTMENT);
        assertThat(field.getPreValue()).isEqualTo("5");
        assertThat(field.getPostValue()).isEqualTo("8");
        // 인사명령 처리는 직접 수정 이력을 따로 남기지 않는다(중복 방지).
        verify(employeeService).updateEmployee(eq(TENANT), eq(ADMIN), eq(1L), any(EmployeeSaveRequestVO.class), eq(false));
    }

    @Test
    void rejectsAFutureOrderDateAnAnUnknownTypeNoTargetsAndDuplicates() throws Exception {
        String tomorrow = LocalDate.now().plusDays(1).toString();
        assertThatThrownBy(() -> service.process(TENANT, ADMIN, request("TRANSFER", tomorrow, "1", "8")))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("명령일은 오늘 이후로 입력할 수 없습니다.");
        assertThatThrownBy(() -> service.process(TENANT, ADMIN, request("TRANSFER", "", "1", "8")))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("명령일을 입력해 주세요.");
        assertThatThrownBy(() -> service.process(TENANT, ADMIN, request("JOIN", TODAY, "1", "8")))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("명령 유형을 선택해 주세요.");
        assertThatThrownBy(() -> service.process(TENANT, ADMIN, request("TRANSFER", TODAY)))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("대상 사원을 선택해 주세요.");
        assertThatThrownBy(() -> service.process(TENANT, ADMIN, request("TRANSFER", TODAY, "1", "8", "1", "9")))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("같은 사원이 중복되어 있습니다.");
        verify(employeeService, never()).updateEmployee(any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void rejectsTheSameValueAndPrefixesTheEmployeeName() throws Exception {
        when(employeeService.getEmployee(TENANT, 1L)).thenReturn(employee(1L, "홍길동", "ACTIVE"));

        assertThatThrownBy(() -> service.process(TENANT, ADMIN, request("TRANSFER", TODAY, "1", "5")))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("홍길동: 현재와 같은 부서입니다.");
        assertThatThrownBy(() -> service.process(TENANT, ADMIN, request("PROMOTION", TODAY, "1", "STAFF")))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("홍길동: 현재와 같은 직위입니다.");
        assertThatThrownBy(() -> service.process(TENANT, ADMIN, request("TRANSFER", TODAY, "1", " ")))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("홍길동: 명령 후 부서 값을 입력해 주세요.");
        verify(recorder, never()).recordOrder(any(), any(), any(), any(), any(), anyList());
    }

    @Test
    void aFailureOnAnyEmployeeKeepsItsStatusAndStopsBeforeTheHistoryIsWritten() throws Exception {
        stubTransfer(1L, employee(1L, "홍길동", "ACTIVE"));
        when(employeeService.getEmployee(TENANT, 2L)).thenReturn(employee(2L, "김철수", "ACTIVE"));
        when(employeeService.updateEmployee(eq(TENANT), eq(ADMIN), eq(2L), any(EmployeeSaveRequestVO.class), eq(false)))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "충돌"));

        assertThatThrownBy(() -> service.process(TENANT, ADMIN, request("TRANSFER", TODAY, "1", "8", "2", "8")))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.getReason()).isEqualTo("김철수: 충돌");
                });
        verify(recorder, never()).recordOrder(any(), any(), any(), any(), any(), anyList());
    }

    @Test
    void retiredEmployeesCannotBeProcessed() throws Exception {
        when(employeeService.getEmployee(TENANT, 1L)).thenReturn(employee(1L, "홍길동", "RETIRED"));

        assertThatThrownBy(() -> service.process(TENANT, ADMIN, request("TRANSFER", TODAY, "1", "8")))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("홍길동: 퇴직한 사원은 인사명령을 처리할 수 없습니다.");
    }

    @Test
    void leaveReturnAndRetireFollowTheEmploymentStatusAndDefaultToTheOrderDate() throws Exception {
        EmployeeVO active = employee(1L, "홍길동", "ACTIVE");
        EmployeeVO leave = employee(2L, "김철수", "LEAVE");
        leave.setSuspendDt("2026-10-01");
        when(employeeService.getEmployee(TENANT, 1L)).thenReturn(active);
        when(employeeService.getEmployee(TENANT, 2L)).thenReturn(leave);

        assertThatThrownBy(() -> service.process(TENANT, ADMIN, request("LEAVE", TODAY, "2", "")))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("김철수: 이미 휴직 중인 사원입니다.");
        assertThatThrownBy(() -> service.process(TENANT, ADMIN, request("RETURN", TODAY, "1", "")))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("홍길동: 휴직 중인 사원만 복직 처리할 수 있습니다.");
        assertThatThrownBy(() -> service.process(TENANT, ADMIN, request("RETIRE", TODAY, "1", "2026/11/01")))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("홍길동: 퇴직일 형식이 올바르지 않습니다. (yyyy-MM-dd)");
    }

    @Test
    void returnFromLeaveSendsTheOrderDateAsTheReturnDate() throws Exception {
        EmployeeVO leave = employee(2L, "김철수", "LEAVE");
        leave.setSuspendDt("2026-10-01");
        when(employeeService.getEmployee(TENANT, 2L)).thenReturn(leave);
        EmployeeVO after = employee(2L, "김철수", "ACTIVE");
        after.setSuspendDt("2026-10-01");
        after.setBackDt(TODAY);
        when(employeeService.updateEmployee(eq(TENANT), eq(ADMIN), eq(2L), any(EmployeeSaveRequestVO.class), eq(false)))
                .thenReturn(after);

        service.process(TENANT, ADMIN, request("RETURN", TODAY, "2", ""));

        ArgumentCaptor<EmployeeSaveRequestVO> payload = ArgumentCaptor.forClass(EmployeeSaveRequestVO.class);
        verify(employeeService).updateEmployee(eq(TENANT), eq(ADMIN), eq(2L), payload.capture(), eq(false));
        assertThat(payload.getValue().getBackDt()).isEqualTo(TODAY);
        assertThat(payload.getValue().getSuspendDt()).isEqualTo("2026-10-01");
        assertThat(payload.getValue().getEmployeeNo()).isEqualTo("261102");
        assertThat(payload.getValue().getPhotoImage()).isNull();
        assertThat(capturedChanges().get(0).getFields().get(0).getField()).isEqualTo(HrOrderField.BACK_DT);
    }

    @Test
    void anotherLeaveClearsThePreviousReturnDateAndRecordsIt() throws Exception {
        EmployeeVO returned = employee(3L, "이영희", "ACTIVE");
        returned.setSuspendDt("2026-03-01");
        returned.setBackDt("2026-04-01");
        when(employeeService.getEmployee(TENANT, 3L)).thenReturn(returned);
        EmployeeVO after = employee(3L, "이영희", "LEAVE");
        after.setSuspendDt(TODAY);
        when(employeeService.updateEmployee(eq(TENANT), eq(ADMIN), eq(3L), any(EmployeeSaveRequestVO.class), eq(false)))
                .thenReturn(after);

        service.process(TENANT, ADMIN, request("LEAVE", TODAY, "3", ""));

        ArgumentCaptor<EmployeeSaveRequestVO> payload = ArgumentCaptor.forClass(EmployeeSaveRequestVO.class);
        verify(employeeService).updateEmployee(eq(TENANT), eq(ADMIN), eq(3L), payload.capture(), eq(false));
        assertThat(payload.getValue().getSuspendDt()).isEqualTo(TODAY);
        assertThat(payload.getValue().getBackDt()).isNull();
        List<HrOrderChange.Field> fields = capturedChanges().get(0).getFields();
        assertThat(fields).extracting(f -> f.getField()).containsExactly(HrOrderField.SUSPEND_DT, HrOrderField.BACK_DT);
        assertThat(fields.get(1).getPreValue()).isEqualTo("2026-04-01");
        assertThat(fields.get(1).getPostValue()).isNull();
    }

    @Test
    void historyIsFilteredByTheInclusiveProcessDatesAndNamesAreResolved() throws Exception {
        HrOrderHistoryVO row = new HrOrderHistoryVO();
        row.setOrderType("TRANSFER");
        row.setFieldCode("DEPARTMENT");
        when(hrOrderDAO.selectHistory(any())).thenReturn(Collections.singletonList(row));

        List<HrOrderHistoryVO> rows = service.listHistory(TENANT, "2026-11-01", "2026-11-20", " 홍 ", "TRANSFER", "ORDER");

        assertThat(rows.get(0).getOrderTypeName()).isEqualTo("부서이동");
        assertThat(rows.get(0).getFieldName()).isEqualTo("부서");
        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.Map<String, Object>> params = ArgumentCaptor.forClass(java.util.Map.class);
        verify(hrOrderDAO).selectHistory(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", TENANT).containsEntry("keyword", "홍")
                .containsEntry("orderType", "TRANSFER").containsEntry("source", "ORDER");
        assertThat(params.getValue().get("fromDt")).isEqualTo(java.sql.Timestamp.valueOf("2026-11-01 00:00:00"));
        assertThat(params.getValue().get("toDt")).isEqualTo(java.sql.Timestamp.valueOf("2026-11-21 00:00:00"));
        assertThatThrownBy(() -> service.listHistory(TENANT, "2026-13-01", null, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(Arrays.asList(HrOrderType.values())).contains(HrOrderType.DIRECT_EDIT);
    }
}
