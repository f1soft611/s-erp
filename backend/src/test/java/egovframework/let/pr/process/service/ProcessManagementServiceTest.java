package egovframework.let.pr.process.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
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
        row.setParentId("g:1");
        row.setName("공정");
        row.setImage("data:image/png;base64,ZmFrZQ==");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Collections.singletonList(row));
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, changes));
        verifyNoInteractions(dao);
    }

    @Test
    void acceptsValidJpegDataWithMatchingMime() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(60, 60, BufferedImage.TYPE_INT_RGB), "jpeg", output);
        ProcessNodeVO row = new ProcessNodeVO();
        row.setId("p:new-1");
        row.setParentId("g:1");
        row.setName("공정");
        row.setImage("data:image/jpeg;base64," + Base64.getEncoder().encodeToString(output.toByteArray()));
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Collections.singletonList(row));
        when(dao.insertProcess(anyMap())).thenReturn(1L);
        service.save(1L, changes);
        verify(dao).insertProcess(anyMap());
    }

    @Test
    void rejectsJpegClaimedAsPng() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(60, 60, BufferedImage.TYPE_INT_RGB), "jpeg", output);
        ProcessNodeVO row = new ProcessNodeVO();
        row.setId("p:new-1");
        row.setParentId("g:1");
        row.setName("공정");
        row.setImage("data:image/png;base64," + Base64.getEncoder().encodeToString(output.toByteArray()));
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Collections.singletonList(row));
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, changes));
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

    @Test
    void attachesNewProcessToNewGroupWithinSameBatch() {
        ProcessNodeVO group = new ProcessNodeVO();
        group.setId("g:new-1");
        group.setName("그룹");
        ProcessNodeVO process = new ProcessNodeVO();
        process.setId("p:new-2");
        process.setParentId("g:new-1");
        process.setName("공정");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Arrays.asList(process, group));
        when(dao.insertGroup(anyMap())).thenReturn(7L);
        when(dao.insertProcess(anyMap())).thenReturn(8L);

        service.save(3L, changes);
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertProcess(captor.capture());
        assertEquals(3L, captor.getValue().get("tenantId"));
        assertEquals(7L, captor.getValue().get("groupId"));
    }

    @Test
    void rejectsDeletingAGroupWithProcesses() {
        ProcessNodeVO group = new ProcessNodeVO();
        group.setId("g:1");
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setDeletedRows(Collections.singletonList(group));
        when(dao.deleteGroup(anyMap())).thenReturn(0);
        assertThrows(IllegalArgumentException.class, () -> service.save(3L, changes));
    }
}
