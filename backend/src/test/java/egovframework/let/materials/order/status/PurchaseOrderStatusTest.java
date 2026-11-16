package egovframework.let.materials.order.status;

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

import egovframework.let.materials.order.status.domain.model.PurchaseOrderStatusSearchVO;
import egovframework.let.materials.order.status.domain.repository.PurchaseOrderStatusDAO;
import egovframework.let.materials.order.status.service.impl.PurchaseOrderStatusServiceImpl;

class PurchaseOrderStatusTest {

    private static final String RESOURCE =
            "egovframework/mapper/let/materials/order/status/EgovPurchaseOrderStatus_SQL_postgresql.xml";

    @Mock
    private PurchaseOrderStatusDAO dao;

    private PurchaseOrderStatusServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new PurchaseOrderStatusServiceImpl(dao);
        when(dao.selectOrderStatusList(anyMap())).thenReturn(Collections.emptyList());
    }

    @Test
    void normalizesSearchConditionsAndScopesToTenant() throws Exception {
        PurchaseOrderStatusSearchVO search = new PurchaseOrderStatusSearchVO();
        search.setKeyword("  PO-2026 ");
        search.setStatus("CANCELED");
        search.setSourceType("DIRECT");
        search.setOrderDtFrom("2026-11-01");
        search.setOrderDtTo("2026-11-30");
        search.setMaterialKeyword(" ");
        service.selectOrderStatusList(1L, search);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass((Class<Map<String, Object>>) (Class<?>) Map.class);
        verify(dao).selectOrderStatusList(captor.capture());
        assertThat(captor.getValue()).containsEntry("tenantId", 1L).containsEntry("keyword", "PO-2026")
                .containsEntry("status", "CANCELED").containsEntry("sourceType", "DIRECT")
                .containsEntry("orderDtFrom", "2026-11-01").containsEntry("orderDtTo", "2026-11-30")
                .containsEntry("materialKeyword", null);
    }

    @Test
    void rejectsInvalidDatesRangesAndEnumValues() {
        assertBadRequest(search -> search.setOrderDtFrom("2026-13-40"));
        PurchaseOrderStatusSearchVO reversed = new PurchaseOrderStatusSearchVO();
        reversed.setDeliveryDtFrom("2026-11-30");
        reversed.setDeliveryDtTo("2026-11-01");
        assertThatThrownBy(() -> service.selectOrderStatusList(1L, reversed)).isInstanceOfSatisfying(
                ResponseStatusException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        assertBadRequest(search -> search.setStatus("DONE"));
        assertBadRequest(search -> search.setSourceType("OTHER"));
        assertThatThrownBy(() -> service.selectOrderStatusList(null, null)).isInstanceOfSatisfying(
                ResponseStatusException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void mapperListsOrderRowsPerItemForTheTenantWithCanceledStatus() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(RESOURCE)) {
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 1L);
        params.put("status", "ACTIVE");
        params.put("keyword", "k");
        params.put("orderDtFrom", "2026-11-01");
        String sql = configuration.getMappedStatement("PurchaseOrderStatusDAO.selectOrderStatusList")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(sql).contains("oh.tenant_id = ?", "oh.use_at = 'Y'", "'ACTIVE'", "'CANCELED'",
                "ORDER BY oh.order_dt DESC, oh.order_no DESC, od.line_no", "oh.order_dt >= CAST(? AS date)");
    }

    private void assertBadRequest(java.util.function.Consumer<PurchaseOrderStatusSearchVO> mutation) {
        PurchaseOrderStatusSearchVO search = new PurchaseOrderStatusSearchVO();
        mutation.accept(search);
        assertThatThrownBy(() -> service.selectOrderStatusList(1L, search)).isInstanceOfSatisfying(
                ResponseStatusException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
