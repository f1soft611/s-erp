package egovframework.let.materials.receipt.status;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
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

import egovframework.let.materials.receipt.status.domain.model.MaterialReceiptStatusSearchVO;
import egovframework.let.materials.receipt.status.domain.repository.MaterialReceiptStatusDAO;
import egovframework.let.materials.receipt.status.service.impl.MaterialReceiptStatusServiceImpl;

class MaterialReceiptStatusTest {

    private static final String RESOURCE =
            "egovframework/mapper/let/materials/receipt/status/EgovMaterialReceiptStatus_SQL_postgresql.xml";

    @Mock
    private MaterialReceiptStatusDAO dao;

    private MaterialReceiptStatusServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new MaterialReceiptStatusServiceImpl(dao);
        when(dao.selectReceiptStatusList(anyMap())).thenReturn(new ArrayList<>());
    }

    @Test
    void defaultsTheStatusToActiveWhenNoneIsGiven() throws Exception {
        service.selectReceiptStatusList(1L, new MaterialReceiptStatusSearchVO());
        assertThat(captured().get("status")).isEqualTo("ACTIVE");

        service.selectReceiptStatusList(1L, null);
        verify(dao, org.mockito.Mockito.times(2)).selectReceiptStatusList(anyMap());
    }

    @Test
    void passesCanceledAndAllThroughAndNormalizesTheOtherConditions() throws Exception {
        MaterialReceiptStatusSearchVO search = new MaterialReceiptStatusSearchVO();
        search.setStatus("CANCELED");
        search.setReceiptNo(" MI-20261117 ");
        search.setReceiptDtFrom("2026-11-01");
        search.setReceiptDtTo("2026-11-30");
        service.selectReceiptStatusList(1L, search);
        Map<String, Object> params = captured();
        assertThat(params).containsEntry("status", "CANCELED").containsEntry("receiptNo", "MI-20261117")
                .containsEntry("receiptDtFrom", "2026-11-01").containsEntry("receiptDtTo", "2026-11-30")
                .containsEntry("tenantId", 1L);

        search.setStatus("ALL");
        service.selectReceiptStatusList(1L, search);
        assertThat(captured().get("status")).isEqualTo("ALL");
    }

    @Test
    void rejectsUnknownStatusBadDatesReversedRangeAndMissingTenant() {
        MaterialReceiptStatusSearchVO search = new MaterialReceiptStatusSearchVO();
        search.setStatus("DELETED");
        assertStatus(() -> service.selectReceiptStatusList(1L, search), HttpStatus.BAD_REQUEST);
        MaterialReceiptStatusSearchVO badDate = new MaterialReceiptStatusSearchVO();
        badDate.setReceiptDtFrom("2026-13-40");
        assertStatus(() -> service.selectReceiptStatusList(1L, badDate), HttpStatus.BAD_REQUEST);
        MaterialReceiptStatusSearchVO reversed = new MaterialReceiptStatusSearchVO();
        reversed.setReceiptDtFrom("2026-11-30");
        reversed.setReceiptDtTo("2026-11-01");
        assertStatus(() -> service.selectReceiptStatusList(1L, reversed), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.selectReceiptStatusList(null, new MaterialReceiptStatusSearchVO()),
                HttpStatus.UNAUTHORIZED);
    }

    @Test
    void mapperFiltersByStatusOnlyWhenActiveOrCanceledAndShowsTheArrivalLink() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(RESOURCE)) {
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        String id = "MaterialReceiptStatusDAO.selectReceiptStatusList";
        assertThat(sql(configuration, id, "ACTIVE")).contains("AND rh.use_at = 'Y'", "rh.tenant_id = ?",
                "AS receiptNo", "AS arrivalNo", "AS arrivalLinked", "AS materialArrivalId", "rd.inspection_no AS inspectionNo", "rd.closing_month AS closingMonth",
                "ORDER BY rh.receipt_dt DESC");
        assertThat(sql(configuration, id, "CANCELED")).contains("AND rh.use_at = 'N'");
        String all = sql(configuration, id, "ALL");
        assertThat(all).doesNotContain("AND rh.use_at");
        assertThat(all).contains("CASE WHEN rh.use_at = 'Y' THEN 'ACTIVE' ELSE 'CANCELED' END AS status");
    }

    private Map<String, Object> captured() throws Exception {
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor =
                ArgumentCaptor.forClass((Class<Map<String, Object>>) (Class<?>) Map.class);
        verify(dao, org.mockito.Mockito.atLeastOnce()).selectReceiptStatusList(captor.capture());
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
