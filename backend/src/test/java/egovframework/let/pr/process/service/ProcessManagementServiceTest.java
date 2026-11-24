package egovframework.let.pr.process.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.Map;
import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import egovframework.let.pr.process.domain.model.ProcessChangesVO;
import egovframework.let.pr.process.domain.model.ProcessNodeVO;
import egovframework.let.pr.process.domain.repository.ProcessManagementDAO;
import egovframework.let.pr.process.service.impl.ProcessManagementServiceImpl;

class ProcessManagementServiceTest {
    private final ProcessManagementDAO dao = mock(ProcessManagementDAO.class);
    private final ProcessManagementService service = new ProcessManagementServiceImpl(dao);

    @Test
    void rejectsBlankGroupNameBeforeWriting() throws Exception {
        ProcessNodeVO row = new ProcessNodeVO();
        row.setId("g:new-1");
        row.setName(" ");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Collections.singletonList(row));
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, changes));
        verifyNoInteractions(dao);
    }

    @Test
    void rejectsInvalidImageBeforeWriting() throws Exception {
        ProcessNodeVO row = new ProcessNodeVO();
        row.setId("p:new-1");
        row.setName("공정");
        row.setImage("data:image/png;base64,ZmFrZQ==");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Collections.singletonList(row));
        assertThrows(IllegalArgumentException.class, () -> service.saveMasters(1L, changes));
        verifyNoInteractions(dao);
    }

    @Test
    void acceptsValidJpegDataWithMatchingMime() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(60, 60, BufferedImage.TYPE_INT_RGB), "jpeg", output);
        ProcessNodeVO row = new ProcessNodeVO();
        row.setId("p:new-1");
        row.setName("공정");
        row.setImage("data:image/jpeg;base64," + Base64.getEncoder().encodeToString(output.toByteArray()));
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Collections.singletonList(row));
        when(dao.insertProcess(anyMap())).thenReturn(1L);
        service.saveMasters(1L, changes);
        verify(dao).insertProcess(anyMap());
    }

    @Test
    void rejectsJpegClaimedAsPng() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(60, 60, BufferedImage.TYPE_INT_RGB), "jpeg", output);
        ProcessNodeVO row = new ProcessNodeVO();
        row.setId("p:new-1");
        row.setName("공정");
        row.setImage("data:image/png;base64," + Base64.getEncoder().encodeToString(output.toByteArray()));
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Collections.singletonList(row));
        assertThrows(IllegalArgumentException.class, () -> service.saveMasters(1L, changes));
        verifyNoInteractions(dao);
    }

    @Test
    void rejectsPersistedIdAsInsertedBeforeWriting() {
        ProcessNodeVO row = new ProcessNodeVO();
        row.setId("g:12");
        row.setName("공정그룹");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Collections.singletonList(row));
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, changes));
        verifyNoInteractions(dao);
    }

    @Test
    void rejectsTemporaryIdAsUpdatedBeforeWriting() {
        ProcessNodeVO row = new ProcessNodeVO();
        row.setId("g:new-1");
        row.setName("공정그룹");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setUpdatedRows(Collections.singletonList(row));
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, changes));
        verifyNoInteractions(dao);
    }

    private ProcessNodeVO link(String id, String parentId, Long processId) {
        ProcessNodeVO row = new ProcessNodeVO();
        row.setId(id);
        row.setParentId(parentId);
        row.setProcessId(processId);
        return row;
    }

    @Test
    void attachesNewLinkToNewWorkplaceWithinSameBatch() {
        ProcessNodeVO group = new ProcessNodeVO();
        group.setId("g:new-1");
        group.setName("작업장");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Arrays.asList(link("m:new-2", "g:new-1", 5L), group));
        when(dao.insertGroup(anyMap())).thenReturn(7L);
        when(dao.insertMapping(anyMap())).thenReturn(8L);

        service.save(3L, changes);
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertMapping(captor.capture());
        assertEquals(3L, captor.getValue().get("tenantId"));
        assertEquals(7L, captor.getValue().get("groupId"));
        assertEquals(5L, captor.getValue().get("processId"));
    }

    @Test
    void rejectsNewProcessRowsInTheWorkplaceTree() {
        ProcessNodeVO process = new ProcessNodeVO();
        process.setId("p:new-1");
        process.setName("공정");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Collections.singletonList(process));
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, changes));
        verifyNoInteractions(dao);
    }

    @Test
    void rejectsUpdatingALinkedProcessRow() {
        ProcessNodeVO row = link("m:3", "g:1", 5L);
        row.setName("변경");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setUpdatedRows(Collections.singletonList(row));
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, changes));
        verifyNoInteractions(dao);
    }

    @Test
    void rejectsLinkWithoutProcessBeforeWriting() {
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Collections.singletonList(link("m:new-1", "g:1", null)));
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, changes));
        verifyNoInteractions(dao);
    }

    @Test
    void rejectsDuplicateLinkInSameRequestBeforeWriting() {
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Arrays.asList(link("m:new-1", "g:1", 5L), link("m:new-2", "g:1", 5L)));
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, changes));
        verifyNoInteractions(dao);
    }

    @Test
    void rejectsLinkWhenTheServerCannotCreateIt() {
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Collections.singletonList(link("m:new-1", "g:1", 5L)));
        when(dao.insertMapping(anyMap())).thenReturn(null);
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, changes));
    }

    @Test
    void deletesLinksBeforeWorkplaces() {
        ProcessNodeVO group = new ProcessNodeVO();
        group.setId("g:1");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setDeletedRows(Arrays.asList(group, link("m:4", "g:1", 5L)));
        when(dao.deleteMapping(anyMap())).thenReturn(1);
        when(dao.deleteGroup(anyMap())).thenReturn(1);
        service.save(3L, changes);
        InOrder order = inOrder(dao);
        order.verify(dao).deleteMapping(anyMap());
        order.verify(dao).deleteGroup(anyMap());
    }

    @Test
    void rejectsDeletingAWorkplaceThatStillHasProcesses() {
        ProcessNodeVO group = new ProcessNodeVO();
        group.setId("g:1");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setDeletedRows(Collections.singletonList(group));
        when(dao.deleteGroup(anyMap())).thenReturn(0);
        assertThrows(IllegalArgumentException.class, () -> service.save(3L, changes));
    }

    @Test
    void rejectsDeletingAMasterLinkedToAWorkplace() {
        ProcessNodeVO master = new ProcessNodeVO();
        master.setId("p:5");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setDeletedRows(Collections.singletonList(master));
        when(dao.deleteProcess(anyMap())).thenReturn(0);
        assertThrows(IllegalArgumentException.class, () -> service.saveMasters(3L, changes));
        verify(dao, never()).listMasters(3L);
    }

    @Test
    void rejectsMasterWithParentAndWorkplaceRowsInMasterSave() {
        ProcessNodeVO child = new ProcessNodeVO();
        child.setId("p:new-1");
        child.setParentId("g:1");
        child.setName("공정");
        ProcessChangesVO withParent = new ProcessChangesVO();
        withParent.setInsertedRows(Collections.singletonList(child));
        assertThrows(IllegalArgumentException.class, () -> service.saveMasters(1L, withParent));
        ProcessNodeVO group = new ProcessNodeVO();
        group.setId("g:new-1");
        group.setName("작업장");
        ProcessChangesVO withGroup = new ProcessChangesVO();
        withGroup.setInsertedRows(Collections.singletonList(group));
        assertThrows(IllegalArgumentException.class, () -> service.saveMasters(1L, withGroup));
        verifyNoInteractions(dao);
    }

    @Test
    void savesMastersAndReturnsTheMasterList() {
        ProcessNodeVO master = new ProcessNodeVO();
        master.setId("p:new-1");
        master.setName("가공");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Collections.singletonList(master));
        when(dao.insertProcess(anyMap())).thenReturn(9L);
        service.saveMasters(3L, changes);
        verify(dao).insertProcess(anyMap());
        verify(dao).listMasters(3L);
    }
}
