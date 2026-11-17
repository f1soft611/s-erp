package egovframework.let.materials.arrival.status;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.materials.arrival.status.domain.model.MaterialArrivalStatusSearchVO;
import egovframework.let.materials.arrival.status.domain.repository.MaterialArrivalStatusDAO;
import egovframework.let.materials.arrival.status.service.impl.MaterialArrivalStatusServiceImpl;

class MaterialArrivalStatusTest {

    private static final String RESOURCE =
            "egovframework/mapper/let/materials/arrival/status/EgovMaterialArrivalStatus_SQL_postgresql.xml";

    @Mock
    private MaterialArrivalStatusDAO dao;

    private MaterialArrivalStatusServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new MaterialArrivalStatusServiceImpl(dao);
        when(dao.selectArrivalStatusList(anyMap())).thenReturn(Collections.emptyList());
    }

    @Test
    void defaultsTheStatusToActiveAndPassesCanceledAndAllThrough() throws Exception {
        service.selectArrivalStatusList(1L, new MaterialArrivalStatusSearchVO());
        service.selectArrivalStatusList(1L, null);
        MaterialArrivalStatusSearchVO canceled = new MaterialArrivalStatusSearchVO();
        canceled.setStatus("CANCELED");
        service.selectArrivalStatusList(1L, canceled);
        MaterialArrivalStatusSearchVO all = new MaterialArrivalStatusSearchVO();
        all.setStatus(" ALL ");
        service.selectArrivalStatusList(1L, all);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor =
                ArgumentCaptor.forClass((Class<Map<String, Object>>) (Class<?>) Map.class);
        verify(dao, org.mockito.Mockito.times(4)).selectArrivalStatusList(captor.capture());
        assertThat(captor.getAllValues()).extracting(params -> params.get("status"))
                .containsExactly("ACTIVE", "ACTIVE", "CANCELED", "ALL");
    }

    @Test
    void normalizesSearchConditionsAndScopesToTenant() throws Exception {
        MaterialArrivalStatusSearchVO search = new MaterialArrivalStatusSearchVO();
        search.setKeyword("  MP-2026 ");
        search.setStatus("CANCELED");
        search.setOrderNo(" PO-1 ");
        search.setArrivalDtFrom("2026-11-01");
        search.setArrivalDtTo("2026-11-30");
        search.setMaterialKeyword(" ");
        service.selectArrivalStatusList(1L, search);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor =
                ArgumentCaptor.forClass((Class<Map<String, Object>>) (Class<?>) Map.class);
        verify(dao).selectArrivalStatusList(captor.capture());
        assertThat(captor.getValue()).containsEntry("tenantId", 1L).containsEntry("keyword", "MP-2026")
                .containsEntry("status", "CANCELED").containsEntry("orderNo", "PO-1")
                .containsEntry("arrivalDtFrom", "2026-11-01").containsEntry("arrivalDtTo", "2026-11-30")
                .containsEntry("materialKeyword", null);
    }

    @Test
    void rejectsInvalidDatesRangesEnumValuesAndMissingTenant() {
        assertBadRequest(search -> search.setArrivalDtFrom("2026-13-40"));
        MaterialArrivalStatusSearchVO reversed = new MaterialArrivalStatusSearchVO();
        reversed.setArrivalDtFrom("2026-11-30");
        reversed.setArrivalDtTo("2026-11-01");
        assertThatThrownBy(() -> service.selectArrivalStatusList(1L, reversed)).isInstanceOfSatisfying(
                ResponseStatusException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        assertBadRequest(search -> search.setStatus("DONE"));
        assertThatThrownBy(() -> service.selectArrivalStatusList(null, null)).isInstanceOfSatisfying(
                ResponseStatusException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void mapperListsArrivalRowsPerItemForTheTenantWithCanceledStatus() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(RESOURCE)) {
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 1L);
        params.put("status", "ACTIVE");
        params.put("keyword", "k");
        params.put("arrivalDtFrom", "2026-11-01");
        String sql = configuration.getMappedStatement("MaterialArrivalStatusDAO.selectArrivalStatusList")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(sql).contains("ah.tenant_id = ?", "ah.use_at = 'Y'", "'ACTIVE'", "'CANCELED'",
                "ORDER BY ah.arrival_dt DESC, ah.arrival_no DESC, ad.line_no", "ah.arrival_dt >= CAST(? AS date)",
                "AS headerTotalAmt", "AS orderNo", "ad.lot_no AS lotNo");
    }

    @Test
    void mapperFiltersByUseAtOnlyForActiveAndCanceledAndNotForAll() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(RESOURCE)) {
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        String id = "MaterialArrivalStatusDAO.selectArrivalStatusList";
        assertThat(sql(configuration, id, "ACTIVE")).contains("AND ah.use_at = 'Y'");
        assertThat(sql(configuration, id, "CANCELED")).contains("AND ah.use_at = 'N'");
        String all = sql(configuration, id, "ALL");
        assertThat(all).doesNotContain("AND ah.use_at");
        assertThat(all).contains("CASE WHEN ah.use_at = 'Y' THEN 'ACTIVE' ELSE 'CANCELED' END AS status");
    }

    private static String sql(Configuration configuration, String id, String status) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 1L);
        params.put("status", status);
        return configuration.getMappedStatement(id).getBoundSql(params).getSql().replaceAll("\\s+", " ");
    }

    private void assertBadRequest(java.util.function.Consumer<MaterialArrivalStatusSearchVO> mutation) {
        MaterialArrivalStatusSearchVO search = new MaterialArrivalStatusSearchVO();
        mutation.accept(search);
        assertThatThrownBy(() -> service.selectArrivalStatusList(1L, search)).isInstanceOfSatisfying(
                ResponseStatusException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
