package egovframework.let.quality.inspect.status;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.util.ArrayList;
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

import egovframework.let.quality.inspect.status.domain.model.QualityInspectionStatusSearchVO;
import egovframework.let.quality.inspect.status.domain.repository.QualityInspectionStatusDAO;
import egovframework.let.quality.inspect.status.service.impl.QualityInspectionStatusServiceImpl;

class QualityInspectionStatusTest {

    private static final String RESOURCE =
            "egovframework/mapper/let/quality/inspect/status/EgovQualityInspectionStatus_SQL_postgresql.xml";

    @Mock
    private QualityInspectionStatusDAO dao;

    private QualityInspectionStatusServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new QualityInspectionStatusServiceImpl(dao);
        when(dao.selectInspectionStatusList(anyMap())).thenReturn(new ArrayList<>());
    }

    @Test
    void defaultsTheStatusToActiveWhenNoneIsGiven() throws Exception {
        service.selectInspectionStatusList(1L, new QualityInspectionStatusSearchVO());
        assertThat(captured().get("status")).isEqualTo("ACTIVE");

        service.selectInspectionStatusList(1L, null);
        verify(dao, times(2)).selectInspectionStatusList(anyMap());
    }

    @Test
    void passesCanceledAndAllThroughAndNormalizesTheOtherConditions() throws Exception {
        QualityInspectionStatusSearchVO search = new QualityInspectionStatusSearchVO();
        search.setStatus("CANCELED");
        search.setInspectionNo(" QI-20261117 ");
        search.setInspectorKeyword("  ");
        search.setInspectionDtFrom("2026-11-01");
        search.setInspectionDtTo("2026-11-30");
        service.selectInspectionStatusList(1L, search);
        Map<String, Object> params = captured();
        assertThat(params).containsEntry("status", "CANCELED").containsEntry("inspectionNo", "QI-20261117")
                .containsEntry("inspectionDtFrom", "2026-11-01").containsEntry("inspectionDtTo", "2026-11-30")
                .containsEntry("tenantId", 1L);
        assertThat(params.get("inspectorKeyword")).isNull();

        search.setStatus("ALL");
        service.selectInspectionStatusList(1L, search);
        assertThat(captured().get("status")).isEqualTo("ALL");
    }

    @Test
    void rejectsUnknownStatusBadDatesReversedRangeAndMissingTenant() {
        QualityInspectionStatusSearchVO search = new QualityInspectionStatusSearchVO();
        search.setStatus("DELETED");
        assertStatus(() -> service.selectInspectionStatusList(1L, search), HttpStatus.BAD_REQUEST);
        QualityInspectionStatusSearchVO badDate = new QualityInspectionStatusSearchVO();
        badDate.setInspectionDtFrom("2026-13-40");
        assertStatus(() -> service.selectInspectionStatusList(1L, badDate), HttpStatus.BAD_REQUEST);
        QualityInspectionStatusSearchVO reversed = new QualityInspectionStatusSearchVO();
        reversed.setInspectionDtFrom("2026-11-30");
        reversed.setInspectionDtTo("2026-11-01");
        assertStatus(() -> service.selectInspectionStatusList(1L, reversed), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.selectInspectionStatusList(null, new QualityInspectionStatusSearchVO()),
                HttpStatus.UNAUTHORIZED);
    }

    @Test
    void mapperFiltersByStatusOnlyWhenActiveOrCanceledAndShowsTheArrivalLinkAndPassRate() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(RESOURCE)) {
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        String id = "QualityInspectionStatusDAO.selectInspectionStatusList";
        assertThat(sql(configuration, id, "ACTIVE")).contains("AND ih.use_at = 'Y'", "ih.tenant_id = ?",
                "AS inspectionNo", "AS arrivalNo", "AS arrivalLinked", "AS purchaseArrivalId", "AS passRate",
                "AS inspectQty", "ORDER BY ih.inspection_dt DESC");
        assertThat(sql(configuration, id, "CANCELED")).contains("AND ih.use_at = 'N'");
        String all = sql(configuration, id, "ALL");
        assertThat(all).doesNotContain("AND ih.use_at");
        assertThat(all).contains("CASE WHEN ih.use_at = 'Y' THEN 'ACTIVE' ELSE 'CANCELED' END AS status");
    }

    private Map<String, Object> captured() throws Exception {
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor =
                ArgumentCaptor.forClass((Class<Map<String, Object>>) (Class<?>) Map.class);
        verify(dao, atLeastOnce()).selectInspectionStatusList(captor.capture());
        return captor.getValue();
    }

    private static String sql(Configuration configuration, String id, String status) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 1L);
        params.put("status", status);
        return configuration.getMappedStatement(id).getBoundSql(params).getSql().replaceAll("\\s+", " ");
    }

    private void assertStatus(ThrowingCall call, HttpStatus status) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(status));
    }

    private interface ThrowingCall {
        void run() throws Exception;
    }
}
