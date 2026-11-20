package egovframework.let.co.master.warehouse.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.Map;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import egovframework.let.co.master.warehouse.domain.model.WarehouseSaveRequestVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseSearchCondition;
import egovframework.let.co.master.warehouse.domain.model.WarehouseVO;
import egovframework.let.co.master.warehouse.domain.repository.WarehouseDAO;

class WarehouseServiceImplTest {

    private static final Long TENANT = 1L;
    private static final Long USER = 9L;

    @Mock
    private WarehouseDAO warehouseDAO;
    @Mock
    private EgovIdGnrService idGnrService;

    private WarehouseServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new WarehouseServiceImpl(warehouseDAO, idGnrService);
        when(idGnrService.getNextStringId()).thenReturn("008");
        when(warehouseDAO.selectWarehouseIdByCode(anyMap())).thenReturn(null);
        when(warehouseDAO.insertWarehouse(anyMap())).thenReturn(10L);
        when(warehouseDAO.updateWarehouse(anyMap())).thenReturn(1);
        when(warehouseDAO.selectWarehouseById(anyMap())).thenAnswer(invocation -> existing("N", "Y"));
    }

    private WarehouseVO existing(String deleteLockAt, String useAt) {
        WarehouseVO warehouse = new WarehouseVO();
        warehouse.setWarehouseId(10L);
        warehouse.setWarehouseCode("008");
        warehouse.setWarehouseName("기존창고");
        warehouse.setDeleteLockAt(deleteLockAt);
        warehouse.setUseAt(useAt);
        return warehouse;
    }

    private WarehouseSaveRequestVO payload() {
        WarehouseSaveRequestVO request = new WarehouseSaveRequestVO();
        request.setWarehouseName("신규창고");
        return request;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> captureInsert() throws Exception {
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(warehouseDAO).insertWarehouse(captor.capture());
        return captor.getValue();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> captureUpdate() throws Exception {
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(warehouseDAO).updateWarehouse(captor.capture());
        return captor.getValue();
    }

    @Test
    void newWarehouseIsInUseByDefault() throws Exception {
        service.createWarehouse(TENANT, USER, payload());

        assertThat(captureInsert().get("useAt")).isEqualTo("Y");
    }

    @Test
    void savesUnusedStateWithoutDeleting() throws Exception {
        WarehouseSaveRequestVO request = payload();
        request.setUseAt("n");

        service.updateWarehouse(TENANT, USER, 10L, request);

        assertThat(captureUpdate().get("useAt")).isEqualTo("N");
    }

    @Test
    void rejectsInvalidUseAt() throws Exception {
        WarehouseSaveRequestVO request = payload();
        request.setUseAt("X");

        assertThatThrownBy(() -> service.createWarehouse(TENANT, USER, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("여부 값은 Y 또는 N이어야 합니다.");
        verify(warehouseDAO, never()).insertWarehouse(anyMap());
    }

    @Test
    void deleteLockedWarehouseCannotBecomeUnused() throws Exception {
        WarehouseSaveRequestVO request = payload();
        request.setDeleteLockAt("Y");
        request.setUseAt("N");

        assertThatThrownBy(() -> service.updateWarehouse(TENANT, USER, 10L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("삭제불가 창고는 미사용으로 변경할 수 없습니다.");
        verify(warehouseDAO, never()).updateWarehouse(anyMap());
    }

    @Test
    void passesUseAtSearchConditionAndNormalizesIt() throws Exception {
        when(warehouseDAO.selectWarehouseList(anyMap())).thenReturn(Collections.<WarehouseVO>emptyList());
        WarehouseSearchCondition condition = new WarehouseSearchCondition();
        condition.setUseAt(" y ");

        service.listWarehouses(TENANT, condition);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(warehouseDAO).selectWarehouseList(captor.capture());
        assertThat(captor.getValue().get("useAt")).isEqualTo("Y");
        assertThat(captor.getValue()).doesNotContainKey("disuseAt");
    }

    @Test
    void invalidUseAtSearchConditionIsRejected() throws Exception {
        WarehouseSearchCondition condition = new WarehouseSearchCondition();
        condition.setUseAt("maybe");

        assertThatThrownBy(() -> service.listWarehouses(TENANT, condition))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
