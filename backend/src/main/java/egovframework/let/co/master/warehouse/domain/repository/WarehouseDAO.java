package egovframework.let.co.master.warehouse.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.master.warehouse.domain.model.WarehouseUserOptionVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseVO;

@Repository("warehouseDAO")
public class WarehouseDAO extends EgovAbstractMapper {

    public List<WarehouseVO> selectWarehouseList(Long tenantId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        return selectWarehouseList(params);
    }

    public List<WarehouseVO> selectWarehouseList(Map<String, Object> params) throws Exception {
        return selectList("WarehouseDAO.selectWarehouseList", params);
    }

    public WarehouseVO selectWarehouseById(Map<String, Object> params) throws Exception {
        return selectOne("WarehouseDAO.selectWarehouseById", params);
    }

    public Long selectWarehouseIdByCode(Map<String, Object> params) throws Exception {
        return selectOne("WarehouseDAO.selectWarehouseIdByCode", params);
    }

    public Long insertWarehouse(Map<String, Object> params) throws Exception {
        return selectOne("WarehouseDAO.insertWarehouse", params);
    }

    public int updateWarehouse(Map<String, Object> params) throws Exception {
        return update("WarehouseDAO.updateWarehouse", params);
    }

    public List<WarehouseUserOptionVO> selectUserOptions(Long tenantId) throws Exception {
        return selectList("WarehouseDAO.selectUserOptions", tenantId);
    }
}
