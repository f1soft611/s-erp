package egovframework.let.hr.employee.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.hr.common.ResidentNumberCipher;
import egovframework.let.hr.employee.domain.model.EmployeePickerVO;
import egovframework.let.hr.employee.domain.repository.EmployeeDAO;

/** 사원 선택 도움창 조회: 부서/전체 분기, 검색어 정리, 테넌트 필수. */
class EmployeePickerServiceTest {

    private static final Long TENANT = 1L;

    private EmployeeDAO employeeDAO;
    private EmployeeServiceImpl service;

    @BeforeEach
    void setUp() {
        employeeDAO = mock(EmployeeDAO.class);
        service = new EmployeeServiceImpl(employeeDAO, mock(IdSequenceService.class), mock(ResidentNumberCipher.class), mock(egovframework.let.hr.order.service.HrOrderHistoryRecorder.class));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> captured() throws Exception {
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(employeeDAO).selectPickerEmployees(captor.capture());
        return captor.getValue();
    }

    @Test
    void withoutADepartmentItAsksForEveryoneOfTheTenant() throws Exception {
        EmployeePickerVO row = new EmployeePickerVO();
        row.setUserId(5L);
        when(employeeDAO.selectPickerEmployees(anyMap())).thenReturn(Collections.singletonList(row));

        List<EmployeePickerVO> result = service.listPickerEmployees(TENANT, null, null);

        assertThat(result).hasSize(1);
        assertThat(captured()).containsEntry("tenantId", TENANT).doesNotContainKey("departmentId").doesNotContainKey("keyword");
    }

    @Test
    void aDepartmentLimitsTheListToItsDirectMembers() throws Exception {
        service.listPickerEmployees(TENANT, 7L, null);

        assertThat(captured()).containsEntry("departmentId", 7L);
    }

    @Test
    void theKeywordIsTrimmedAndBlankIsIgnored() throws Exception {
        service.listPickerEmployees(TENANT, null, "  홍길  ");
        assertThat(captured()).containsEntry("keyword", "홍길");
    }

    @Test
    void aBlankKeywordIsNotSent() throws Exception {
        service.listPickerEmployees(TENANT, null, "   ");
        assertThat(captured()).doesNotContainKey("keyword");
    }

    @Test
    void aKeywordOver100CharactersIsRejected() throws Exception {
        char[] chars = new char[101];
        Arrays.fill(chars, 'a');

        assertThatThrownBy(() -> service.listPickerEmployees(TENANT, null, new String(chars)))
                .isInstanceOf(IllegalArgumentException.class);
        verify(employeeDAO, never()).selectPickerEmployees(anyMap());
    }

    @Test
    void theTenantIsRequiredAndNullFromTheDaoBecomesAnEmptyList() throws Exception {
        assertThatThrownBy(() -> service.listPickerEmployees(null, null, null))
                .isInstanceOf(IllegalArgumentException.class);

        when(employeeDAO.selectPickerEmployees(anyMap())).thenReturn(null);
        assertThat(service.listPickerEmployees(TENANT, null, null)).isEmpty();
    }
}
