package egovframework.let.co.master.material.service.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.*;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.session.Configuration;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.co.master.material.domain.model.*;
import egovframework.let.co.master.material.domain.repository.MaterialInfoDAO;
import egovframework.let.co.master.classification.domain.model.ClassificationKind;
import egovframework.let.co.master.classification.domain.model.ClassificationVO;
import egovframework.let.co.master.classification.domain.repository.ClassificationDAO;
import egovframework.let.co.master.classification.service.ClassificationSelectionValidator;

@ExtendWith(MockitoExtension.class)
class MaterialInfoServiceImplTest {
    @Mock MaterialInfoDAO dao;
    @Mock EgovIdGnrService generator;
    @Mock ClassificationDAO classificationDao;
    MaterialInfoServiceImpl service;

    @BeforeEach void setup() {
        service = new MaterialInfoServiceImpl(dao, generator, new ClassificationSelectionValidator(classificationDao));
    }

    private MaterialInfoSaveRequestVO payload(String code) {
        MaterialInfoSaveRequestVO p = new MaterialInfoSaveRequestVO();
        p.setMaterialCode(code);
        p.setMaterialName(" Sample ");
        p.setMaterialTypeCode(" RAW ");
        return p;
    }

    private MaterialInfoSaveRequestVO expiryPayload(String code, String status, Integer count) {
        MaterialInfoSaveRequestVO p = payload(code);
        p.setExpiryedStatus(status);
        p.setExpiryedCount(count);
        return p;
    }

    private void stubInsert() throws Exception {
        when(dao.selectMaterialIdByCode(anyMap())).thenReturn(null);
        when(dao.insertMaterial(anyMap())).thenReturn(12L);
        when(dao.selectMaterialById(anyMap())).thenReturn(new MaterialInfoVO());
    }

    @Test void preservesOmittedClassificationAndExplicitlyClearsIt() throws Exception {
        MaterialInfoVO existing = new MaterialInfoVO();
        existing.setItemClsId(8L);
        when(dao.selectMaterialById(anyMap())).thenReturn(existing);
        when(dao.updateMaterial(anyMap())).thenReturn(1);
        service.updateMaterial(9L, "101", 12L, payload(""));
        MaterialInfoSaveRequestVO clear = payload("");
        clear.setItemClsId(null);
        service.updateMaterial(9L, "101", 12L, clear);
        ArgumentCaptor<Map<String, Object>> captured = ArgumentCaptor.forClass(Map.class);
        verify(dao, times(2)).updateMaterial(captured.capture());
        assertThat(captured.getAllValues().get(0)).containsEntry("itemClsId", 8L);
        assertThat(captured.getAllValues().get(1)).containsEntry("itemClsId", null);
    }

    @Test void savesSelectedClassificationWithoutReplacingLegacyCategory() throws Exception {
        ClassificationVO root = new ClassificationVO();
        root.setId(8L); root.setLevel(1); root.setUseAt("Y");
        when(classificationDao.selectById(ClassificationKind.ITEM, 9L, 8L)).thenReturn(root);
        stubInsert();
        when(generator.getNextStringId()).thenReturn("000001");
        MaterialInfoSaveRequestVO request = payload("");
        request.setItemClsId(8L);
        request.setMatCataType("LEGACY");
        service.createMaterial(9L, "101", request);
        ArgumentCaptor<Map<String, Object>> captured = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertMaterial(captured.capture());
        assertThat(captured.getValue()).containsEntry("itemClsId", 8L).containsEntry("matCataType", "LEGACY");
    }

    @Test void rejectsUnavailableClassificationBeforeWriting() throws Exception {
        MaterialInfoSaveRequestVO request = payload("");
        request.setItemClsId(999L);
        assertThatThrownBy(() -> service.createMaterial(9L, "101", request)).isInstanceOf(IllegalArgumentException.class);
        when(dao.selectMaterialById(anyMap())).thenReturn(new MaterialInfoVO());
        assertThatThrownBy(() -> service.updateMaterial(9L, "101", 12L, request)).isInstanceOf(IllegalArgumentException.class);
        verify(dao, never()).insertMaterial(anyMap());
        verify(dao, never()).updateMaterial(anyMap());
    }

    @Test void generatesSixDigitCodeAndSetsTenantAndStringAudit() throws Exception {
        stubInsert();
        when(generator.getNextStringId()).thenReturn("000001");
        service.createMaterial(9L, "00101", payload(""));
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertMaterial(captor.capture());
        assertThat(captor.getValue()).containsEntry("tenantId", 9L)
                .containsEntry("materialCode", "000001").containsEntry("materialName", "Sample")
                .containsEntry("materialTypeCode", "RAW").containsEntry("createdBy", "00101")
                .containsEntry("expiryedStatus", "NONE").containsEntry("matCataType", "");
    }

    @Test void alwaysGeneratesCodeAndIgnoresEvenAnOversizedSuppliedCode() throws Exception {
        stubInsert();
        when(generator.getNextStringId()).thenReturn("000001");
        service.createMaterial(9L, "101", payload(String.join("", java.util.Collections.nCopies(21, "x"))));
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertMaterial(captor.capture());
        assertThat(captor.getValue()).containsEntry("materialCode", "000001");
        verify(generator).getNextStringId();
    }

    @Test void acceptsAllConsistentExpiryPairs() throws Exception {
        stubInsert();
        when(generator.getNextStringId()).thenReturn("000001", "000002", "000003", "000004");

        service.createMaterial(9L, "101", expiryPayload("NONE", "NONE", null));
        service.createMaterial(9L, "101", expiryPayload("DAY", "DAY", 1));
        service.createMaterial(9L, "101", expiryPayload("MONTH", "MONTH", 30));
        service.createMaterial(9L, "101", expiryPayload("YEAR", "YEAR", Integer.MAX_VALUE));

        verify(dao, times(4)).insertMaterial(anyMap());
    }

    @Test void rejectsInconsistentExpiryPairsBeforeInsertOrUpdate() throws Exception {
        MaterialInfoSaveRequestVO[] invalid = {
                expiryPayload("NONE_COUNT", "NONE", 1),
                expiryPayload("DAY_NULL", "DAY", null),
                expiryPayload("MONTH_ZERO", "MONTH", 0),
                expiryPayload("YEAR_NEGATIVE", "YEAR", -1)
        };

        for (MaterialInfoSaveRequestVO p : invalid) {
            assertThatThrownBy(() -> service.createMaterial(9L, "101", p))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("소비기한");
            assertThatThrownBy(() -> service.updateMaterial(9L, "101", 12L, p))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("소비기한");
        }

        verify(dao, never()).insertMaterial(anyMap());
        verify(dao, never()).updateMaterial(anyMap());
    }

    @Test void rejectsExhaustionAndRetriesAlreadyUsedCodes() throws Exception {
        when(generator.getNextStringId()).thenReturn("000001", "1000000");
        when(dao.selectMaterialIdByCode(anyMap())).thenReturn(10L);
        assertThatThrownBy(() -> service.createMaterial(9L, "101", payload("")))
                .isInstanceOf(IllegalArgumentException.class);
        verify(dao, never()).insertMaterial(anyMap());
    }

    @Test void rejectsRequiredFieldsLengthsAndInvalidNumbers() throws Exception {
        MaterialInfoSaveRequestVO p = payload("A");
        p.setMaterialTypeCode(" ");
        assertThatThrownBy(() -> service.createMaterial(9L, "101", p)).isInstanceOf(IllegalArgumentException.class);
        p.setMaterialTypeCode("RAW");
        p.setMaterialName(String.join("", java.util.Collections.nCopies(201, "x")));
        assertThatThrownBy(() -> service.createMaterial(9L, "101", p)).isInstanceOf(IllegalArgumentException.class);
        p.setMaterialName("Sample");
        p.setSafeInvoice(Double.NaN);
        assertThatThrownBy(() -> service.createMaterial(9L, "101", p)).isInstanceOf(IllegalArgumentException.class);
        p.setSafeInvoice(null);
        p.setExpiryedCount(0);
        assertThatThrownBy(() -> service.createMaterial(9L, "101", p)).isInstanceOf(IllegalArgumentException.class);
        p.setExpiryedCount(null);
        p.setExpiryedStatus("OTHER");
        assertThatThrownBy(() -> service.createMaterial(9L, "101", p)).isInstanceOf(IllegalArgumentException.class);
        verify(dao, never()).insertMaterial(anyMap());
    }

    @Test void reportsDuplicateCodeExplicitly() throws Exception {
        when(generator.getNextStringId()).thenReturn("000001");
        when(dao.selectMaterialIdByCode(anyMap())).thenReturn(null);
        when(dao.insertMaterial(anyMap())).thenThrow(new DuplicateKeyException("duplicate"));
        assertThatThrownBy(() -> service.createMaterial(9L, "101", payload("A")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("이미 사용");
    }

    @Test void rejectsUninitializedZeroGeneratorValue() throws Exception {
        when(generator.getNextStringId()).thenReturn("000000");
        assertThatThrownBy(() -> service.createMaterial(9L, "101", payload("")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("초기화");
        verify(dao, never()).insertMaterial(anyMap());
    }

    @Test void refusesForeignDeletedOrMissingRowsBeforeUpdate() throws Exception {
        assertThatThrownBy(() -> service.updateMaterial(9L, "101", 12L, payload("A")))
                .isInstanceOf(ResponseStatusException.class);
        verify(dao, never()).updateMaterial(anyMap());
    }

    @Test void updatesAllBusinessFieldsWithinAuthenticatedTenant() throws Exception {
        when(dao.selectMaterialById(anyMap())).thenReturn(new MaterialInfoVO());
        when(dao.updateMaterial(anyMap())).thenReturn(1);
        MaterialInfoSaveRequestVO p = payload("");
        p.setMaterialSpec2("SPEC2");
        p.setSafeInvoice(0.0);
        p.setExpiryedStatus("DAY");
        p.setExpiryedCount(30);
        p.setKfdaReportNo("REPORT");
        service.updateMaterial(9L, "00101", 12L, p);
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(dao).updateMaterial(captor.capture());
        assertThat(captor.getValue()).containsEntry("tenantId", 9L).containsEntry("materialId", 12L)
                .containsEntry("materialSpec2", "SPEC2").containsEntry("safeInvoice", 0.0)
                .containsEntry("expiryedCount", 30).containsEntry("kfdaReportNo", "REPORT")
                .containsEntry("updatedBy", "00101").doesNotContainKey("materialCode");
        verify(dao, never()).selectMaterialIdByCode(anyMap());
        verifyNoInteractions(generator);
    }

    @Test void updateIgnoresForgedCodeAndDoesNotPassCodeToUpdate() throws Exception {
        when(dao.selectMaterialById(anyMap())).thenReturn(new MaterialInfoVO());
        when(dao.updateMaterial(anyMap())).thenReturn(1);

        service.updateMaterial(9L, "00101", 12L, payload("FORGED"));

        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(dao).updateMaterial(captor.capture());
        assertThat(captor.getValue()).doesNotContainKey("materialCode");
        verify(dao, never()).selectMaterialIdByCode(anyMap());
        verifyNoInteractions(generator);
    }

    @Test void trimsSearchAndUsesAuthenticatedTenant() throws Exception {
        MaterialInfoSearchCondition c = new MaterialInfoSearchCondition();
        c.setKeyword(" Sample ");
        c.setMaterialKind(" FOOD ");
        service.listMaterials(9L, c);
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(dao).selectMaterialList(captor.capture());
        assertThat(captor.getValue()).containsEntry("tenantId", 9L)
                .containsEntry("keyword", "Sample").containsEntry("materialKind", "FOOD");
    }

    @Test void mapperScopesReadsAndWritesAndRegistersAllColumns() throws Exception {
        Configuration c = new Configuration();
        String path = "egovframework/mapper/let/co/master/material/MaterialInfo_SQL_postgresql.xml";
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream(path)) {
            assertThat(stream).isNotNull();
            new XMLMapperBuilder(stream, c, path, c.getSqlFragments()).parse();
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 9L);
        params.put("keyword", "Sample");
        for (String statement : new String[] {"selectMaterialList", "selectMaterialById", "updateMaterial"}) {
            String sql = c.getMappedStatement("MaterialInfoDAO." + statement).getBoundSql(params).getSql();
            assertThat(sql).contains("tenant_id = ?", "delete_status = 'N'", "deleted_at IS NULL");
        }
        String sql = c.getMappedStatement("MaterialInfoDAO.insertMaterial").getBoundSql(params).getSql();
        assertThat(sql).contains("material_type_code", "expiryed_count", "kfda_report_no", "CURRENT_TIMESTAMP");
        String updateSql = c.getMappedStatement("MaterialInfoDAO.updateMaterial").getBoundSql(params).getSql();
        assertThat(updateSql).doesNotContain("material_code =");
        String options = c.getMappedStatement("MaterialInfoDAO.selectMaterialOptions").getBoundSql(params).getSql();
        assertThat(options).contains("g.tenant_id = ?", "g.use_at = 'Y'", "i.use_at = 'Y'",
                "'ITEM_TYPE'", "'ITEM_UNIT'", "'MATERIAL_TYPE'", "'STORE_METHOD'", "'EXPIRY_STATUS'");
    }
}
