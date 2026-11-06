package egovframework.let.co.master.warehouse.service;

import java.util.List;

import egovframework.let.co.master.warehouse.domain.model.WarehouseSaveRequestVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseSearchCondition;
import egovframework.let.co.master.warehouse.domain.model.WarehouseUserOptionVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseVO;

public interface WarehouseService {

    List<WarehouseVO> listWarehouses(Long tenantId) throws Exception;

    List<WarehouseVO> listWarehouses(Long tenantId, WarehouseSearchCondition condition)
            throws Exception;

    WarehouseVO createWarehouse(
            Long tenantId, Long currentUserId, WarehouseSaveRequestVO payload) throws Exception;

    WarehouseVO updateWarehouse(
            Long tenantId, Long currentUserId, Long warehouseId,
            WarehouseSaveRequestVO payload) throws Exception;

    List<WarehouseUserOptionVO> listUserOptions(Long tenantId) throws Exception;
}
