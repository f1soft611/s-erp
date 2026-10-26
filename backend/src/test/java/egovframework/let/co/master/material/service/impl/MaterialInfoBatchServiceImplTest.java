package egovframework.let.co.master.material.service.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.sql.Connection;
import java.util.Collections;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import egovframework.let.co.master.material.domain.model.*;
import egovframework.let.co.master.material.service.*;

class MaterialInfoBatchServiceImplTest {
    private final MaterialInfoService materials = mock(MaterialInfoService.class);
    private final MaterialInfoBatchServiceImpl service = new MaterialInfoBatchServiceImpl(materials);

    private MaterialInfoBatchSaveRequestVO batch() {
        MaterialInfoChangeVO inserted = new MaterialInfoChangeVO();
        inserted.setMaterialId("new-material");
        inserted.setMaterialName("Sample");
        inserted.setMaterialTypeCode("RAW");
        MaterialInfoChangeVO updated = new MaterialInfoChangeVO();
        updated.setMaterialId("12");
        updated.setMaterialCode("000012");
        updated.setMaterialName("Sample");
        updated.setMaterialTypeCode("RAW");
        MaterialInfoBatchChangeSetVO changes = new MaterialInfoBatchChangeSetVO();
        changes.setInsertedRows(Collections.singletonList(inserted));
        changes.setUpdatedRows(Collections.singletonList(updated));
        MaterialInfoBatchSaveRequestVO request = new MaterialInfoBatchSaveRequestVO();
        request.setMaterials(changes);
        return request;
    }

    @Test void delegatesAllChangesToTenantScopedService() throws Exception {
        MaterialInfoVO created = new MaterialInfoVO();
        created.setMaterialId(31L);
        MaterialInfoVO updated = new MaterialInfoVO();
        updated.setMaterialId(12L);
        when(materials.createMaterial(eq(9L), eq("101"), any())).thenReturn(created);
        when(materials.updateMaterial(eq(9L), eq("101"), eq(12L), any())).thenReturn(updated);
        MaterialInfoBatchSaveResultVO result = service.saveBatch(9L, "101", batch());
        assertThat(result.getMaterials()).containsExactly(created, updated);
        assertThat(result.getRowIdMappings()).containsEntry("new-material", 31L).containsEntry("12", 12L);
    }

    @Test void rejectsDeletesNullRowsAndInvalidIdsBeforeWriting() {
        MaterialInfoBatchSaveRequestVO request = batch();
        request.getMaterials().setDeletedRows(request.getMaterials().getUpdatedRows());
        assertThatThrownBy(() -> service.saveBatch(9L, "101", request)).hasMessageContaining("삭제");
        request.getMaterials().setDeletedRows(Collections.emptyList());
        request.getMaterials().getUpdatedRows().get(0).setMaterialId("invalid");
        assertThatThrownBy(() -> service.saveBatch(9L, "101", request)).isInstanceOf(IllegalArgumentException.class);
        request.getMaterials().setInsertedRows(Collections.singletonList(null));
        assertThatThrownBy(() -> service.saveBatch(9L, "101", request)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(materials);
    }

    @Test void rejectsDuplicateRequestIdsBeforeWriting() {
        MaterialInfoBatchSaveRequestVO request = batch();
        request.getMaterials().getInsertedRows().get(0).setMaterialId("12");
        assertThatThrownBy(() -> service.saveBatch(9L, "101", request)).hasMessageContaining("중복");
        verifyNoInteractions(materials);
    }

    @Test void rollsBackEarlierRowsOnCheckedException() throws Exception {
        DataSource ds = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(ds.getConnection()).thenReturn(connection);
        when(connection.getAutoCommit()).thenReturn(true);
        when(materials.createMaterial(eq(9L), eq("101"), any())).thenReturn(new MaterialInfoVO());
        when(materials.updateMaterial(eq(9L), eq("101"), eq(12L), any())).thenThrow(new Exception("update failed"));
        ProxyFactory factory = new ProxyFactory(service);
        factory.addAdvice(new TransactionInterceptor(new DataSourceTransactionManager(ds),
                new AnnotationTransactionAttributeSource()));
        MaterialInfoBatchService transactional = (MaterialInfoBatchService) factory.getProxy();
        assertThatThrownBy(() -> transactional.saveBatch(9L, "101", batch())).hasMessage("update failed");
        verify(connection).rollback();
        verify(connection, never()).commit();
    }
}
