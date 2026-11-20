package egovframework.let.hr.employee.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.hr.employee.domain.model.EmployeeBatchChangeSetVO;
import egovframework.let.hr.employee.domain.model.EmployeeBatchSaveRequestVO;
import egovframework.let.hr.employee.domain.model.EmployeeBatchSaveResultVO;
import egovframework.let.hr.employee.domain.model.EmployeeChangeVO;
import egovframework.let.hr.employee.domain.model.EmployeeVO;
import egovframework.let.hr.employee.service.EmployeeService;

/** 사원 일괄 저장: 공통 행 폼의 "적용 → 화면 저장" 흐름. 기존 단건 서비스를 한 트랜잭션에서 순서대로 호출한다. */
class EmployeeBatchServiceImplTest {

    private static final Long TENANT = 1L;
    private static final Long ADMIN = 9L;

    private EmployeeService employeeService;
    private EmployeeBatchServiceImpl service;

    @BeforeEach
    void setUp() {
        employeeService = mock(EmployeeService.class);
        service = new EmployeeBatchServiceImpl(employeeService);
    }

    private static EmployeeChangeVO change(String rowId, String name) {
        EmployeeChangeVO vo = new EmployeeChangeVO();
        vo.setUserId(rowId);
        vo.setUserNm(name);
        return vo;
    }

    private static EmployeeVO saved(Long userId) {
        EmployeeVO vo = new EmployeeVO();
        vo.setUserId(userId);
        return vo;
    }

    private static EmployeeBatchSaveRequestVO request(
            EmployeeChangeVO[] inserted, EmployeeChangeVO[] updated, EmployeeChangeVO[] deleted) {
        EmployeeBatchChangeSetVO set = new EmployeeBatchChangeSetVO();
        set.setInsertedRows(Arrays.asList(inserted));
        set.setUpdatedRows(Arrays.asList(updated));
        set.setDeletedRows(Arrays.asList(deleted));
        EmployeeBatchSaveRequestVO payload = new EmployeeBatchSaveRequestVO();
        payload.setEmployees(set);
        return payload;
    }

    private static final EmployeeChangeVO[] NONE = new EmployeeChangeVO[0];

    @Test
    void createsInsertedRowsThenUpdatesAndMapsRowIds() throws Exception {
        EmployeeChangeVO added = change("new-employee-1", "신규");
        EmployeeChangeVO edited = change("5", "수정");
        when(employeeService.createEmployee(TENANT, ADMIN, added)).thenReturn(saved(101L));
        when(employeeService.updateEmployee(TENANT, ADMIN, 5L, edited)).thenReturn(saved(5L));

        EmployeeBatchSaveResultVO result = service.saveBatch(TENANT, ADMIN,
                request(new EmployeeChangeVO[] {added}, new EmployeeChangeVO[] {edited}, NONE));

        assertThat(result.getEmployees()).extracting("userId").containsExactly(101L, 5L);
        assertThat(result.getRowIdMappings()).containsEntry("new-employee-1", 101L).containsEntry("5", 5L);
        InOrder order = inOrder(employeeService);
        order.verify(employeeService).createEmployee(TENANT, ADMIN, added);
        order.verify(employeeService).updateEmployee(TENANT, ADMIN, 5L, edited);
    }

    @Test
    void rejectsDeletionBecauseEmployeesAreRetiredNotDeleted() throws Exception {
        assertThatThrownBy(() -> service.saveBatch(TENANT, ADMIN,
                request(NONE, NONE, new EmployeeChangeVO[] {change("5", "삭제")})))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("삭제할 수 없습니다");
        verify(employeeService, never()).createEmployee(anyLong(), anyLong(), any());
    }

    @Test
    void anUpdateNeedsAPositiveNumericId() throws Exception {
        for (String bad : new String[] {"", "abc", "0", "-3", "new-employee-1"}) {
            assertThatThrownBy(() -> service.saveBatch(TENANT, ADMIN,
                    request(NONE, new EmployeeChangeVO[] {change(bad, "수정")}, NONE)))
                    .as(bad).isInstanceOf(IllegalArgumentException.class);
        }
        verify(employeeService, never()).updateEmployee(anyLong(), anyLong(), anyLong(), any());
    }

    @Test
    void rejectsDuplicateRequestRowIds() throws Exception {
        assertThatThrownBy(() -> service.saveBatch(TENANT, ADMIN,
                request(new EmployeeChangeVO[] {change("new-1", "가"), change("new-1", "나")}, NONE, NONE)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("중복");
        verify(employeeService, never()).createEmployee(anyLong(), anyLong(), any());
    }

    @Test
    void aFailureIsReportedWithTheEmployeeNameAndKeepsTheStatus() throws Exception {
        EmployeeChangeVO added = change("new-employee-1", "홍길동");
        when(employeeService.createEmployee(TENANT, ADMIN, added))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 사번입니다."));

        assertThatThrownBy(() -> service.saveBatch(TENANT, ADMIN, request(new EmployeeChangeVO[] {added}, NONE, NONE)))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.getReason()).isEqualTo("홍길동: 이미 사용 중인 사번입니다.");
                });
    }

    @Test
    void anInputErrorKeepsItsTypeAndGetsTheEmployeeNameToo() throws Exception {
        EmployeeChangeVO edited = change("5", "김철수");
        when(employeeService.updateEmployee(TENANT, ADMIN, 5L, edited))
                .thenThrow(new IllegalArgumentException("이메일 형식이 올바르지 않습니다."));

        assertThatThrownBy(() -> service.saveBatch(TENANT, ADMIN, request(NONE, new EmployeeChangeVO[] {edited}, NONE)))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("김철수: 이메일 형식이 올바르지 않습니다.");
    }

    @Test
    void anEmptyRequestIsRejectedButAnEmptyChangeSetSavesNothing() throws Exception {
        assertThatThrownBy(() -> service.saveBatch(TENANT, ADMIN, null)).isInstanceOf(IllegalArgumentException.class);

        EmployeeBatchSaveResultVO result = service.saveBatch(TENANT, ADMIN, new EmployeeBatchSaveRequestVO());

        assertThat(result.getEmployees()).isEqualTo(Collections.emptyList());
        assertThat(result.getRowIdMappings()).isEmpty();
    }

    @Test
    void aMissingNameIsAnInputError() throws Exception {
        assertThatThrownBy(() -> service.saveBatch(TENANT, ADMIN,
                request(new EmployeeChangeVO[] {change("new-1", "  ")}, NONE, NONE)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("이름");
    }
}
