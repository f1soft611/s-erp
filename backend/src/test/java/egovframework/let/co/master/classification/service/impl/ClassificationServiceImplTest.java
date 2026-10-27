package egovframework.let.co.master.classification.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Collections;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.co.master.classification.domain.model.ClassificationCreateRequestVO;
import egovframework.let.co.master.classification.domain.model.ClassificationKind;
import egovframework.let.co.master.classification.domain.model.ClassificationSaveRequestVO;
import egovframework.let.co.master.classification.domain.model.ClassificationVO;
import egovframework.let.co.master.classification.domain.repository.ClassificationDAO;

class ClassificationServiceImplTest {
    private static final Long TENANT = 21L;
    private static final String ACTOR = "tester";
    private ClassificationDAO dao;
    private ClassificationServiceImpl service;

    @BeforeEach
    void setUp() {
        dao = mock(ClassificationDAO.class);
        service = new ClassificationServiceImpl(dao);
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void createsTrimmedRootWithDefaultsAndAuditActor(ClassificationKind kind) throws Exception {
        ClassificationCreateRequestVO request = createRequest(null);
        when(dao.insert(eq(kind), eq(TENANT), anyMap())).thenReturn(10L);
        ClassificationVO saved = node(10L, null, 1, "Y");
        when(dao.selectById(kind, TENANT, 10L)).thenReturn(saved);

        assertThat(service.create(kind, TENANT, ACTOR, request)).isSameAs(saved);

        Map<String, Object> values = inserted(kind);
        assertThat(values).containsEntry("name", "분류").containsEntry("level", 1)
                .containsEntry("parentId", null).containsEntry("sortSeq", 0)
                .containsEntry("useAt", "Y").containsEntry("actorId", ACTOR);
        verify(dao, never()).selectForUpdate(any(), anyLong(), anyLong());
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void locksSameTenantParentBeforeCreatingChildAtMaximumDepth(ClassificationKind kind) throws Exception {
        int parentLevel = kind == ClassificationKind.ITEM ? 2 : 1;
        when(dao.selectForUpdate(kind, TENANT, 7L)).thenReturn(node(7L, null, parentLevel, "Y"));
        when(dao.insert(eq(kind), eq(TENANT), anyMap())).thenReturn(10L);
        when(dao.selectById(kind, TENANT, 10L)).thenReturn(node(10L, 7L, parentLevel + 1, "N"));
        ClassificationCreateRequestVO request = createRequest(7L);
        request.setSortSeq(4);
        request.setUseAt("N");

        service.create(kind, TENANT, ACTOR, request);

        InOrder order = inOrder(dao);
        order.verify(dao).selectForUpdate(kind, TENANT, 7L);
        order.verify(dao).insert(eq(kind), eq(TENANT), anyMap());
        assertThat(inserted(kind)).containsEntry("level", parentLevel + 1)
                .containsEntry("parentId", 7L).containsEntry("sortSeq", 4).containsEntry("useAt", "N");
    }

    @Test
    void missingOrForeignTenantParentIsNotFound() throws Exception {
        assertThatThrownBy(() -> service.create(ClassificationKind.ITEM, TENANT, ACTOR, createRequest(7L)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(dao).selectForUpdate(ClassificationKind.ITEM, TENANT, 7L);
        verify(dao, never()).insert(any(), anyLong(), anyMap());
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void rejectsChildrenBelowMaximumDepth(ClassificationKind kind) throws Exception {
        when(dao.selectForUpdate(kind, TENANT, 7L))
                .thenReturn(node(7L, null, kind == ClassificationKind.ITEM ? 3 : 2, "Y"));
        assertThatThrownBy(() -> service.create(kind, TENANT, ACTOR, createRequest(7L)))
                .isInstanceOf(IllegalArgumentException.class);
        verify(dao, never()).insert(any(), anyLong(), anyMap());
    }

    @Test
    void rejectsInactiveParentEvenForInactiveChild() throws Exception {
        when(dao.selectForUpdate(ClassificationKind.ITEM, TENANT, 7L)).thenReturn(node(7L, null, 1, "N"));
        ClassificationCreateRequestVO request = createRequest(7L);
        request.setUseAt("N");
        assertThatThrownBy(() -> service.create(ClassificationKind.ITEM, TENANT, ACTOR, request))
                .isInstanceOf(IllegalArgumentException.class);
        verify(dao, never()).insert(any(), anyLong(), anyMap());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "123456789012345678901234567890123456789012345678901"})
    void rejectsInvalidNamesOnCreateAndUpdate(String name) {
        ClassificationCreateRequestVO request = createRequest(null);
        request.setName(name);
        assertThatThrownBy(() -> service.create(ClassificationKind.ITEM, TENANT, ACTOR, request))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.update(ClassificationKind.ITEM, TENANT, ACTOR, 10L, request))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(dao);
    }

    @Test
    void rejectsNegativeSortOnCreateAndUpdate() {
        ClassificationCreateRequestVO request = createRequest(null);
        request.setSortSeq(-1);
        assertThatThrownBy(() -> service.create(ClassificationKind.ITEM, TENANT, ACTOR, request))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.update(ClassificationKind.ITEM, TENANT, ACTOR, 10L, request))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(dao);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "y", "n", " Y ", "YES"})
    void rejectsInvalidUseAtOnCreateAndUpdate(String useAt) {
        ClassificationCreateRequestVO request = createRequest(null);
        request.setUseAt(useAt);
        assertThatThrownBy(() -> service.create(ClassificationKind.ITEM, TENANT, ACTOR, request))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.update(ClassificationKind.ITEM, TENANT, ACTOR, 10L, request))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(dao);
    }

    @Test
    void updateRequiresUseAt() {
        assertThatThrownBy(() -> service.update(ClassificationKind.ITEM, TENANT, ACTOR, 10L, createRequest(null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void locksTargetBeforeCheckingActiveChildrenAndRejectsDeactivation() throws Exception {
        when(dao.selectForUpdate(ClassificationKind.ITEM, TENANT, 10L)).thenReturn(node(10L, null, 1, "Y"));
        when(dao.countActiveChildren(ClassificationKind.ITEM, TENANT, 10L)).thenReturn(1);
        assertThatThrownBy(() -> service.update(ClassificationKind.ITEM, TENANT, ACTOR, 10L, updateRequest("N")))
                .isInstanceOf(IllegalArgumentException.class);
        InOrder order = inOrder(dao);
        order.verify(dao).selectForUpdate(ClassificationKind.ITEM, TENANT, 10L);
        order.verify(dao).countActiveChildren(ClassificationKind.ITEM, TENANT, 10L);
        verify(dao, never()).update(any(), anyLong(), anyLong(), anyMap());
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void updateCannotChangeParentOrLevelAndAllowsDeactivationWithoutActiveChildren(ClassificationKind kind) throws Exception {
        when(dao.selectForUpdate(kind, TENANT, 10L)).thenReturn(node(10L, 7L, 2, "Y"));
        when(dao.update(eq(kind), eq(TENANT), eq(10L), anyMap())).thenReturn(1);
        ClassificationVO saved = node(10L, 7L, 2, "N");
        when(dao.selectById(kind, TENANT, 10L)).thenReturn(saved);
        ClassificationCreateRequestVO request = createRequest(99L);
        request.setUseAt("N");

        assertThat(service.update(kind, TENANT, ACTOR, 10L, request)).isSameAs(saved);

        ArgumentCaptor<Map<String, Object>> captor = mapCaptor();
        verify(dao).update(eq(kind), eq(TENANT), eq(10L), captor.capture());
        assertThat(captor.getValue()).doesNotContainKeys("parentId", "level")
                .containsEntry("actorId", ACTOR).containsEntry("name", "분류").containsEntry("sortSeq", 0);
        verify(dao).countActiveChildren(kind, TENANT, 10L);
        verify(dao, never()).selectForUpdate(kind, TENANT, 99L);
    }

    @Test
    void reactivationLocksAndRequiresActiveSameTenantParent() throws Exception {
        when(dao.selectForUpdate(ClassificationKind.ITEM, TENANT, 10L)).thenReturn(node(10L, 7L, 2, "N"));
        when(dao.selectForUpdate(ClassificationKind.ITEM, TENANT, 7L)).thenReturn(node(7L, null, 1, "N"));
        assertThatThrownBy(() -> service.update(ClassificationKind.ITEM, TENANT, ACTOR, 10L, updateRequest("Y")))
                .isInstanceOf(IllegalArgumentException.class);
        verify(dao, never()).update(any(), anyLong(), anyLong(), anyMap());
    }

    @Test
    void allowsReactivationWithActiveParent() throws Exception {
        when(dao.selectForUpdate(ClassificationKind.ITEM, TENANT, 10L)).thenReturn(node(10L, 7L, 2, "N"));
        when(dao.selectForUpdate(ClassificationKind.ITEM, TENANT, 7L)).thenReturn(node(7L, null, 1, "Y"));
        when(dao.update(eq(ClassificationKind.ITEM), eq(TENANT), eq(10L), anyMap())).thenReturn(1);
        when(dao.selectById(ClassificationKind.ITEM, TENANT, 10L)).thenReturn(node(10L, 7L, 2, "Y"));
        assertThat(service.update(ClassificationKind.ITEM, TENANT, ACTOR, 10L, updateRequest("Y")).getUseAt())
                .isEqualTo("Y");
    }

    @Test
    void missingTargetAndZeroRowUpdateAreNotFound() throws Exception {
        assertThatThrownBy(() -> service.update(ClassificationKind.ITEM, TENANT, ACTOR, 10L, updateRequest("Y")))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        when(dao.selectForUpdate(ClassificationKind.ITEM, TENANT, 10L)).thenReturn(node(10L, null, 1, "Y"));
        assertThatThrownBy(() -> service.update(ClassificationKind.ITEM, TENANT, ACTOR, 10L, updateRequest("Y")))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void listIsTenantScopedAndDatabaseErrorsPropagate() throws Exception {
        when(dao.selectList(ClassificationKind.PARTNER, TENANT)).thenReturn(Collections.emptyList());
        assertThat(service.list(ClassificationKind.PARTNER, TENANT)).isEmpty();
        verify(dao).selectList(ClassificationKind.PARTNER, TENANT);
        when(dao.insert(eq(ClassificationKind.ITEM), eq(TENANT), anyMap())).thenThrow(new IllegalStateException("db"));
        assertThatThrownBy(() -> service.create(ClassificationKind.ITEM, TENANT, ACTOR, createRequest(null)))
                .isInstanceOf(IllegalStateException.class);
    }

    private Map<String, Object> inserted(ClassificationKind kind) throws Exception {
        ArgumentCaptor<Map<String, Object>> captor = mapCaptor();
        verify(dao).insert(eq(kind), eq(TENANT), captor.capture());
        return captor.getValue();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private ArgumentCaptor<Map<String, Object>> mapCaptor() {
        return ArgumentCaptor.forClass((Class) Map.class);
    }

    private ClassificationCreateRequestVO createRequest(Long parentId) {
        ClassificationCreateRequestVO request = new ClassificationCreateRequestVO();
        request.setName(" 분류 ");
        request.setParentId(parentId);
        return request;
    }

    private ClassificationSaveRequestVO updateRequest(String useAt) {
        ClassificationSaveRequestVO request = new ClassificationSaveRequestVO();
        request.setName(" 분류 ");
        request.setUseAt(useAt);
        return request;
    }

    private ClassificationVO node(Long id, Long parentId, int level, String useAt) {
        ClassificationVO node = new ClassificationVO();
        node.setId(id);
        node.setParentId(parentId);
        node.setLevel(level);
        node.setUseAt(useAt);
        return node;
    }
}
