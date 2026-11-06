package egovframework.let.co.master.warehouse.service.impl;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import egovframework.let.co.master.warehouse.domain.model.WarehouseBatchChangeSetVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseBatchSaveRequestVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseBatchSaveResultVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseChangeVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseVO;
import egovframework.let.co.master.warehouse.service.WarehouseBatchService;
import egovframework.let.co.master.warehouse.service.WarehouseService;

@Service("warehouseBatchService")
public class WarehouseBatchServiceImpl extends EgovAbstractServiceImpl implements WarehouseBatchService {

    private final WarehouseService warehouseService;

    public WarehouseBatchServiceImpl(WarehouseService warehouseService) {
        this.warehouseService = warehouseService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public WarehouseBatchSaveResultVO saveBatch(
            Long tenantId, Long currentUserId, WarehouseBatchSaveRequestVO payload) throws Exception {
        if (payload == null) {
            throw new IllegalArgumentException("저장 요청이 비어 있습니다.");
        }
        WarehouseBatchChangeSetVO changes = payload.getWarehouses() == null
                ? new WarehouseBatchChangeSetVO() : payload.getWarehouses();
        if (!changes.getDeletedRows().isEmpty()) {
            throw new IllegalArgumentException("창고는 삭제할 수 없습니다. 불용창고로 변경해 주세요.");
        }
        for (WarehouseChangeVO row : changes.getInsertedRows()) {
            validateWarehouseRow(row);
        }
        for (WarehouseChangeVO row : changes.getUpdatedRows()) {
            validateWarehouseRow(row);
            requireWarehouseId(row.getWarehouseId());
        }

        Set<String> requestIds = new HashSet<>();
        Stream.concat(changes.getInsertedRows().stream(), changes.getUpdatedRows().stream()).forEach(row -> {
            if (StringUtils.hasText(row.getWarehouseId()) && !requestIds.add(row.getWarehouseId())) {
                throw new IllegalArgumentException("창고 요청 행 ID가 중복되었습니다.");
            }
        });
        WarehouseBatchSaveResultVO result = new WarehouseBatchSaveResultVO();
        List<WarehouseVO> savedWarehouses = new ArrayList<>();
        for (WarehouseChangeVO row : changes.getInsertedRows()) {
            WarehouseVO saved = warehouseService.createWarehouse(tenantId, currentUserId, row);
            savedWarehouses.add(saved);
            if (StringUtils.hasText(row.getWarehouseId())) {
                result.getRowIdMappings().put(row.getWarehouseId(), saved.getWarehouseId());
            }
        }
        for (WarehouseChangeVO row : changes.getUpdatedRows()) {
            WarehouseVO saved = warehouseService.updateWarehouse(
                    tenantId, currentUserId, requireWarehouseId(row.getWarehouseId()), row);
            savedWarehouses.add(saved);
            result.getRowIdMappings().put(row.getWarehouseId(), saved.getWarehouseId());
        }

        result.setWarehouses(savedWarehouses);
        return result;
    }

    private void validateWarehouseRow(WarehouseChangeVO row) {
        if (row == null) {
            throw new IllegalArgumentException("창고 변경 행이 비어 있습니다.");
        }
        if (!StringUtils.hasText(row.getWarehouseName())) {
            throw new IllegalArgumentException("창고명은 필수입니다.");
        }
    }

    private Long requireWarehouseId(String value) {
        if (value != null && value.trim().matches("[0-9]+")) {
            try {
                Long id = Long.valueOf(value.trim());
                if (id > 0) {
                    return id;
                }
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException("창고 수정 시 올바른 ID가 필요합니다.", ex);
            }
        }
        throw new IllegalArgumentException("창고 수정 시 올바른 ID가 필요합니다.");
    }
}
