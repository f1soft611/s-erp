package egovframework.let.hr.order.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Date;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import egovframework.let.hr.employee.domain.model.EmployeeVO;
import egovframework.let.hr.order.domain.model.HrOrderChange;
import egovframework.let.hr.order.domain.model.HrOrderField;
import egovframework.let.hr.order.domain.model.HrOrderType;
import egovframework.let.hr.order.domain.repository.HrOrderDAO;

class HrOrderHistoryRecorderImplTest {

    private static final Long TENANT = 1L;
    private static final Long ADMIN = 9L;

    @Mock
    private HrOrderDAO hrOrderDAO;

    private HrOrderHistoryRecorderImpl recorder;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        recorder = new HrOrderHistoryRecorderImpl(hrOrderDAO);
        when(hrOrderDAO.insertOrderHd(anyMap())).thenReturn(50L);
    }

    private static EmployeeVO employee(Long departmentId, String departmentNm, String positionCode, String positionNm) {
        EmployeeVO vo = new EmployeeVO();
        vo.setUserId(11L);
        vo.setUserNm("홍길동");
        vo.setDepartmentId(departmentId);
        vo.setDepartmentNm(departmentNm);
        vo.setPositionCode(positionCode);
        vo.setPositionNm(positionNm);
        vo.setEmploymentTypeCode("REGULAR");
        vo.setEmploymentTypeNm("정규");
        vo.setJoinDt("2026-11-05");
        return vo;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> header() throws Exception {
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(hrOrderDAO).insertOrderHd(captor.capture());
        return captor.getValue();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> details(int count) throws Exception {
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(hrOrderDAO, times(count)).insertOrderDt(captor.capture());
        return captor.getAllValues();
    }

    @Test
    void aNewEmployeeGetsAJoinHistoryOnTheJoinDateWithJoinDateDepartmentAndPosition() throws Exception {
        recorder.recordJoin(TENANT, ADMIN, employee(5L, "생산1팀", "STAFF", "사원"));

        Map<String, Object> header = header();
        assertThat(header.get("orderType")).isEqualTo("JOIN");
        assertThat(header.get("orderSource")).isEqualTo("JOIN");
        assertThat(header.get("orderDt")).isEqualTo(Date.valueOf("2026-11-05"));
        assertThat(header.get("createdBy")).isEqualTo(ADMIN);
        List<Map<String, Object>> details = details(3);
        assertThat(details).extracting(d -> d.get("fieldCode")).containsExactly("JOIN_DT", "DEPARTMENT", "POSITION");
        assertThat(details.get(1).get("preValue")).isNull();
        assertThat(details.get(1).get("postValue")).isEqualTo("5");
        assertThat(details.get(1).get("postName")).isEqualTo("생산1팀");
    }

    @Test
    void aDirectEditRecordsOnlyTheTrackedFieldsThatActuallyChanged() throws Exception {
        EmployeeVO before = employee(5L, "생산1팀", "STAFF", "사원");
        EmployeeVO after = employee(8L, "경영지원팀", "STAFF", "사원");
        after.setUserNm("홍길동 수정");

        recorder.recordDirectEdit(TENANT, ADMIN, before, after);

        Map<String, Object> header = header();
        assertThat(header.get("orderType")).isEqualTo("DIRECT_EDIT");
        assertThat(header.get("orderSource")).isEqualTo("DIRECT");
        assertThat(header.get("orderDt")).isEqualTo(Date.valueOf(LocalDate.now()));
        List<Map<String, Object>> details = details(1);
        assertThat(details.get(0)).containsEntry("fieldCode", "DEPARTMENT").containsEntry("preValue", "5")
                .containsEntry("preName", "생산1팀").containsEntry("postValue", "8").containsEntry("postName", "경영지원팀");
    }

    @Test
    void nothingIsRecordedWhenNoTrackedFieldChanged() throws Exception {
        EmployeeVO before = employee(5L, "생산1팀", "STAFF", "사원");
        EmployeeVO after = employee(5L, "생산1팀", "STAFF", "사원");
        after.setUserNm("이름만 변경");

        recorder.recordDirectEdit(TENANT, ADMIN, before, after);

        verify(hrOrderDAO, never()).insertOrderHd(anyMap());
        verify(hrOrderDAO, never()).insertOrderDt(anyMap());
    }

    @Test
    void anOrderWritesOneHeaderAndOneDetailPerChangedField() throws Exception {
        HrOrderChange first = new HrOrderChange(11L).add(HrOrderField.DEPARTMENT, "5", "생산1팀", "8", "경영지원팀");
        HrOrderChange second = new HrOrderChange(12L).add(HrOrderField.DEPARTMENT, "5", "생산1팀", "8", "경영지원팀");

        Long orderId = recorder.recordOrder(TENANT, ADMIN, HrOrderType.TRANSFER, LocalDate.of(2026, 11, 20), "  조직 개편  ",
                java.util.Arrays.asList(first, second));

        assertThat(orderId).isEqualTo(50L);
        Map<String, Object> header = header();
        assertThat(header.get("orderSource")).isEqualTo("ORDER");
        assertThat(header.get("orderType")).isEqualTo("TRANSFER");
        assertThat(header.get("remark")).isEqualTo("조직 개편");
        assertThat(details(2)).extracting(d -> d.get("userId")).containsExactly(11L, 12L);
        assertThat(details(2)).extracting(d -> d.get("orderId")).containsOnly(50L);
    }

    @Test
    void aTooLongRemarkIsRejected() {
        StringBuilder remark = new StringBuilder();
        for (int i = 0; i < 501; i++) {
            remark.append('가');
        }
        assertThatThrownBy(() -> recorder.recordOrder(TENANT, ADMIN, HrOrderType.TRANSFER, LocalDate.now(), remark.toString(),
                Collections.<HrOrderChange>emptyList())).isInstanceOf(IllegalArgumentException.class);
    }
}
