package egovframework.let.hr.department.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.hr.department.domain.model.DepartmentSaveRequestVO;
import egovframework.let.hr.department.domain.model.DepartmentVO;
import egovframework.let.hr.department.domain.repository.DepartmentDAO;

class DepartmentServiceImplTest {

    private static final Long TENANT = 1L;
    private static final Long USER = 9L;

    @Mock
    private DepartmentDAO departmentDAO;

    private DepartmentServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new DepartmentServiceImpl(departmentDAO);
        when(departmentDAO.insertDepartment(anyMap())).thenReturn(100L);
        when(departmentDAO.updateDepartment(anyMap())).thenReturn(1);
        when(departmentDAO.updateDepartmentUse(anyMap())).thenReturn(1);
        when(departmentDAO.existsActiveMember(anyMap())).thenReturn(true);
    }

    private static DepartmentVO dept(Long id, Long parentId, String name, String useAt) {
        DepartmentVO vo = new DepartmentVO();
        vo.setDepartmentId(id);
        vo.setTenantId(TENANT);
        vo.setParentDepartmentId(parentId);
        vo.setDepartmentNm(name);
        vo.setUseAt(useAt);
        return vo;
    }

    private static DepartmentSaveRequestVO payload(Long parentId, String name) {
        DepartmentSaveRequestVO vo = new DepartmentSaveRequestVO();
        vo.setParentDepartmentId(parentId);
        vo.setDepartmentNm(name);
        return vo;
    }

    private void stubFind(DepartmentVO... departments) throws Exception {
        for (DepartmentVO department : departments) {
            when(departmentDAO.selectDepartmentById(org.mockito.ArgumentMatchers.argThat(
                    (Map<String, Object> m) -> m != null && department.getDepartmentId().equals(m.get("departmentId")))))
                    .thenReturn(department);
        }
        when(departmentDAO.selectDepartmentList(anyMap())).thenReturn(Arrays.asList(departments));
    }

    @Test
    void createsRootDepartmentWithTrimmedNameAndDefaults() throws Exception {
        stubFind(dept(100L, null, "본사", "Y"));

        DepartmentVO created = service.createDepartment(TENANT, USER, payload(null, "  본사  "));

        assertThat(created.getDepartmentId()).isEqualTo(100L);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(departmentDAO).insertDepartment(captor.capture());
        assertThat(captor.getValue()).containsEntry("departmentNm", "본사")
                .containsEntry("tenantId", TENANT).containsEntry("sortOrder", 0)
                .containsEntry("createdBy", USER).containsEntry("updatedBy", USER);
    }

    @Test
    void rejectsBlankOrTooLongName() throws Exception {
        assertThatThrownBy(() -> service.createDepartment(TENANT, USER, payload(null, "   ")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("부서명");
        StringBuilder longName = new StringBuilder();
        for (int i = 0; i < 101; i++) {
            longName.append('가');
        }
        assertThatThrownBy(() -> service.createDepartment(TENANT, USER, payload(null, longName.toString())))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("100자");
        verify(departmentDAO, never()).insertDepartment(anyMap());
    }

    @Test
    void rejectsDuplicateNameUnderSameParentAsConflict() throws Exception {
        stubFind(dept(1L, null, "본사", "Y"));
        when(departmentDAO.countSiblingName(anyMap())).thenReturn(1);

        assertThatThrownBy(() -> service.createDepartment(TENANT, USER, payload(1L, "영업팀")))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verify(departmentDAO, never()).insertDepartment(anyMap());
    }

    @Test
    void mapsDatabaseDuplicateKeyToConflict() throws Exception {
        stubFind(dept(1L, null, "본사", "Y"));
        when(departmentDAO.insertDepartment(anyMap())).thenThrow(new DuplicateKeyException("dup"));

        assertThatThrownBy(() -> service.createDepartment(TENANT, USER, payload(1L, "영업팀")))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void rejectsMissingOrInactiveParent() throws Exception {
        when(departmentDAO.selectDepartmentById(anyMap())).thenReturn(null);
        assertThatThrownBy(() -> service.createDepartment(TENANT, USER, payload(55L, "영업팀")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("상위 부서");

        stubFind(dept(2L, null, "폐지부서", "N"));
        assertThatThrownBy(() -> service.createDepartment(TENANT, USER, payload(2L, "영업팀")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("사용안함");
    }

    @Test
    void rejectsManagerWhoIsNotAnActiveMemberOfThisDepartment() throws Exception {
        stubFind(dept(100L, null, "본사", "Y"));
        when(departmentDAO.existsActiveMember(anyMap())).thenReturn(false);
        DepartmentSaveRequestVO request = payload(null, "본사");
        request.setManagerUserId(77L);

        assertThatThrownBy(() -> service.updateDepartment(TENANT, USER, 100L, request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("소속 사원");
        verify(departmentDAO, never()).updateDepartment(anyMap());
    }

    @Test
    void checksMembershipOfTheDepartmentBeingEdited() throws Exception {
        stubFind(dept(2L, null, "영업팀", "Y"));
        DepartmentSaveRequestVO request = payload(null, "영업팀");
        request.setManagerUserId(5L);

        service.updateDepartment(TENANT, USER, 2L, request);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(departmentDAO).existsActiveMember(captor.capture());
        assertThat(captor.getValue()).containsEntry("tenantId", TENANT)
                .containsEntry("departmentId", 2L).containsEntry("userId", 5L);
    }

    @Test
    void newDepartmentsCannotHaveAManagerBecauseTheyHaveNoMembersYet() throws Exception {
        stubFind(dept(100L, null, "본사", "Y"));
        DepartmentSaveRequestVO request = payload(null, "본사");
        request.setManagerUserId(5L);

        assertThatThrownBy(() -> service.createDepartment(TENANT, USER, request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("등록 후");
        verify(departmentDAO, never()).insertDepartment(anyMap());
    }

    @Test
    void keepingTheCurrentManagerIsAllowedEvenIfHeLeftTheDepartment() throws Exception {
        DepartmentVO existing = dept(2L, null, "영업팀", "Y");
        existing.setManagerUserId(5L);
        stubFind(existing);
        when(departmentDAO.existsActiveMember(anyMap())).thenReturn(false);
        DepartmentSaveRequestVO request = payload(null, "영업1팀");
        request.setManagerUserId(5L);

        service.updateDepartment(TENANT, USER, 2L, request);

        verify(departmentDAO).updateDepartment(anyMap());
        verify(departmentDAO, never()).existsActiveMember(anyMap());
    }

    @Test
    void rejectsMovingDepartmentUnderItselfOrItsDescendant() throws Exception {
        DepartmentVO root = dept(1L, null, "본사", "Y");
        DepartmentVO team = dept(2L, 1L, "영업팀", "Y");
        DepartmentVO part = dept(3L, 2L, "영업1파트", "Y");
        stubFind(root, team, part);

        assertThatThrownBy(() -> service.updateDepartment(TENANT, USER, 2L, payload(2L, "영업팀")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("하위");
        assertThatThrownBy(() -> service.updateDepartment(TENANT, USER, 1L, payload(3L, "본사")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("하위");
        verify(departmentDAO, never()).updateDepartment(anyMap());
    }

    @Test
    void allowsRenameKeepingAnInactiveParent() throws Exception {
        DepartmentVO oldRoot = dept(1L, null, "구본사", "N");
        DepartmentVO team = dept(2L, 1L, "영업팀", "Y");
        stubFind(oldRoot, team);

        DepartmentVO updated = service.updateDepartment(TENANT, USER, 2L, payload(1L, "영업1팀"));

        assertThat(updated).isNotNull();
        verify(departmentDAO).updateDepartment(anyMap());
    }

    @Test
    void blocksDeactivationWhileActiveChildrenOrUsersExist() throws Exception {
        stubFind(dept(1L, null, "본사", "Y"));
        when(departmentDAO.countActiveChildren(anyMap())).thenReturn(1);
        assertThatThrownBy(() -> service.changeUse(TENANT, USER, 1L, "N"))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.getReason()).contains("하위 부서 또는 소속 사원");
                });

        when(departmentDAO.countActiveChildren(anyMap())).thenReturn(0);
        when(departmentDAO.countActiveUsers(anyMap())).thenReturn(3);
        assertThatThrownBy(() -> service.changeUse(TENANT, USER, 1L, "N"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verify(departmentDAO, never()).updateDepartmentUse(anyMap());
    }

    @Test
    void deactivatesAnEmptyDepartment() throws Exception {
        stubFind(dept(1L, null, "본사", "Y"));

        service.changeUse(TENANT, USER, 1L, "n");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(departmentDAO).updateDepartmentUse(captor.capture());
        assertThat(captor.getValue()).containsEntry("useAt", "N").containsEntry("updatedBy", USER);
    }

    @Test
    void blocksRestoreWhileParentIsInactiveAndRejectsBadFlag() throws Exception {
        DepartmentVO oldRoot = dept(1L, null, "구본사", "N");
        DepartmentVO team = dept(2L, 1L, "영업팀", "N");
        stubFind(oldRoot, team);

        assertThatThrownBy(() -> service.changeUse(TENANT, USER, 2L, "Y"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        assertThatThrownBy(() -> service.changeUse(TENANT, USER, 2L, "X"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void readsCompanyNameFromTenantSoTheRootFollowsCompanyInfoChanges() throws Exception {
        when(departmentDAO.selectCompanyName(TENANT)).thenReturn("에프원소프트");

        assertThat(service.getCompanyName(TENANT)).isEqualTo("에프원소프트");
        when(departmentDAO.selectCompanyName(TENANT)).thenReturn(null);
        assertThat(service.getCompanyName(TENANT)).isEmpty();
    }

    @Test
    void listsActiveUsersWithoutDepartmentForTheTenantOnly() throws Exception {
        service.listUnassignedUsers(TENANT, null);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(departmentDAO).selectUnassignedUsers(captor.capture());
        assertThat(captor.getValue()).containsEntry("tenantId", TENANT).containsEntry("status", "ACTIVE");
        assertThatThrownBy(() -> service.listUnassignedUsers(null, null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void memberListsDefaultToActiveAcceptRetiredAndAllAndRejectOtherValues() throws Exception {
        stubFind(dept(1L, null, "본사", "Y"));

        service.listDepartmentUsers(TENANT, 1L, " retired ");
        service.listDepartmentUsers(TENANT, 1L, "all");
        service.listDepartmentUsers(TENANT, 1L, null);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(departmentDAO, org.mockito.Mockito.times(3)).selectDepartmentUsers(captor.capture());
        assertThat(captor.getAllValues()).extracting(m -> m.get("status")).containsExactly("RETIRED", "ALL", "ACTIVE");
        assertThatThrownBy(() -> service.listDepartmentUsers(TENANT, 1L, "BOGUS")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void hidesInactiveDepartmentsUnlessRequested() throws Exception {
        List<DepartmentVO> rows = Arrays.asList(dept(1L, null, "본사", "Y"));
        when(departmentDAO.selectDepartmentList(anyMap())).thenReturn(rows);

        service.listDepartments(TENANT, false);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(departmentDAO).selectDepartmentList(captor.capture());
        assertThat(captor.getValue()).containsEntry("tenantId", TENANT).containsEntry("includeInactive", false);
    }
}
