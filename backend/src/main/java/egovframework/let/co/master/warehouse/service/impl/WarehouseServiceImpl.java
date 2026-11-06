package egovframework.let.co.master.warehouse.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.postgresql.util.PSQLException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.co.master.warehouse.domain.model.WarehouseSaveRequestVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseSearchCondition;
import egovframework.let.co.master.warehouse.domain.model.WarehouseUserOptionVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseVO;
import egovframework.let.co.master.warehouse.domain.repository.WarehouseDAO;
import egovframework.let.co.master.warehouse.service.WarehouseService;

@Service("warehouseService")
public class WarehouseServiceImpl extends EgovAbstractServiceImpl implements WarehouseService {

    private static final int MAX_GENERATED_CODE_ATTEMPTS = 10;
    private static final String GENERATED_CODE_PATTERN = "[0-9]{3}";

    private final WarehouseDAO warehouseDAO;
    private final EgovIdGnrService warehouseCodeIdGnrService;

    public WarehouseServiceImpl(
            WarehouseDAO warehouseDAO,
            @Qualifier("warehouseCodeIdGnrService") EgovIdGnrService warehouseCodeIdGnrService) {
        this.warehouseDAO = warehouseDAO;
        this.warehouseCodeIdGnrService = warehouseCodeIdGnrService;
    }

    @Override
    public List<WarehouseVO> listWarehouses(Long tenantId) throws Exception {
        validateTenantId(tenantId);
        return warehouseDAO.selectWarehouseList(tenantId);
    }

    @Override
    public List<WarehouseVO> listWarehouses(
            Long tenantId,
            WarehouseSearchCondition condition) throws Exception {
        validateTenantId(tenantId);
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        if (condition != null) {
            putSearchValue(params, "keyword", condition.getKeyword());
            putSearchValue(params, "warehouseType", condition.getWarehouseType());
            putSearchValue(params, "disuseAt", normalizeSearchFlag(condition.getDisuseAt()));
        }
        return warehouseDAO.selectWarehouseList(params);
    }

    private void putSearchValue(Map<String, Object> params, String key, String value) {
        if (StringUtils.hasText(value)) {
            params.put(key, value.trim());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public WarehouseVO createWarehouse(
            Long tenantId,
            Long currentUserId,
            WarehouseSaveRequestVO payload) throws Exception {
        validateTenantId(tenantId);
        validatePayload(payload);
        String warehouseName = requireWarehouseName(payload.getWarehouseName());
        String warehouseCode = resolveWarehouseCode(tenantId, payload.getWarehouseCode(), null);

        Map<String, Object> params = buildSaveParams(tenantId, currentUserId, warehouseName, payload);
        params.put("warehouseCode", warehouseCode);
        Long warehouseId;
        try {
            warehouseId = warehouseDAO.insertWarehouse(params);
        } catch (DuplicateKeyException ex) {
            throw duplicateSaveError(ex);
        }
        if (warehouseId == null) {
            throw new IllegalStateException("창고 등록 결과를 확인할 수 없습니다.");
        }
        return findByIdOrThrow(tenantId, warehouseId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public WarehouseVO updateWarehouse(
            Long tenantId,
            Long currentUserId,
            Long warehouseId,
            WarehouseSaveRequestVO payload) throws Exception {
        validateTenantId(tenantId);
        if (warehouseId == null) {
            throw new IllegalArgumentException("창고 ID가 필요합니다.");
        }
        validatePayload(payload);
        WarehouseVO existing = findByIdOrThrow(tenantId, warehouseId);
        String warehouseName = requireWarehouseName(payload.getWarehouseName());
        String warehouseCode = StringUtils.hasText(payload.getWarehouseCode())
                ? resolveWarehouseCode(tenantId, payload.getWarehouseCode(), warehouseId)
                : existing.getWarehouseCode();

        Map<String, Object> params = buildSaveParams(tenantId, currentUserId, warehouseName, payload);
        params.put("warehouseId", warehouseId);
        params.put("warehouseCode", warehouseCode);
        int updatedRows;
        try {
            updatedRows = warehouseDAO.updateWarehouse(params);
        } catch (DuplicateKeyException ex) {
            throw duplicateSaveError(ex);
        }
        if (updatedRows == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "창고를 찾을 수 없습니다.");
        }
        return findByIdOrThrow(tenantId, warehouseId);
    }

    @Override
    public List<WarehouseUserOptionVO> listUserOptions(Long tenantId) throws Exception {
        validateTenantId(tenantId);
        return warehouseDAO.selectUserOptions(tenantId);
    }

    private Map<String, Object> buildSaveParams(
            Long tenantId,
            Long currentUserId,
            String warehouseName,
            WarehouseSaveRequestVO payload) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("warehouseName", warehouseName);
        params.put("warehouseType", normalizeText(payload.getWarehouseType()));
        params.put("deleteLockAt", normalizeFlag(payload.getDeleteLockAt(), "N"));
        params.put("disuseAt", normalizeFlag(payload.getDisuseAt(), "N"));
        params.put("stockQtyDispAt", normalizeFlag(payload.getStockQtyDispAt(), "Y"));
        params.put("stockIoAt", normalizeFlag(payload.getStockIoAt(), "Y"));
        params.put("safetyStockAlertAt", normalizeFlag(payload.getSafetyStockAlertAt(), "N"));
        params.put("stockDefaultAt", normalizeFlag(payload.getStockDefaultAt(), "N"));
        params.put("plantId", payload.getPlantId());
        params.put("customerId", payload.getCustomerId());
        params.put("managerUserId", payload.getManagerUserId());
        params.put("departmentId", payload.getDepartmentId());
        params.put("telNo", normalizeText(payload.getTelNo()));
        params.put("faxNo", normalizeText(payload.getFaxNo()));
        params.put("address", normalizeText(payload.getAddress()));
        params.put("remark", normalizeText(payload.getRemark()));
        params.put("createdBy", currentUserId);
        params.put("updatedBy", currentUserId);
        return params;
    }

    private String resolveWarehouseCode(
            Long tenantId,
            String requestedCode,
            Long excludeWarehouseId) throws Exception {
        if (StringUtils.hasText(requestedCode)) {
            String trimmed = requestedCode.trim();
            if (findWarehouseIdByCode(tenantId, trimmed, excludeWarehouseId) != null) {
                throw new IllegalArgumentException("이미 사용 중인 창고코드입니다.");
            }
            return trimmed;
        }
        for (int attempt = 0; attempt < MAX_GENERATED_CODE_ATTEMPTS; attempt++) {
            String generatedCode = warehouseCodeIdGnrService.getNextStringId();
            if (isZeroCode(generatedCode)) {
                // EgovTableIdGnrServiceImpl은 해당 tableName의 채번 카운터 행이 없을 때
                // 최초 1회 호출에 한해 0을 반환하고, 그 다음 호출부터 1부터 정상 채번한다.
                // 0은 유효한 창고코드가 아니므로 버리고 다음 값을 다시 채번한다.
                continue;
            }
            validateGeneratedCode(generatedCode);
            if (findWarehouseIdByCode(tenantId, generatedCode, excludeWarehouseId) == null) {
                return generatedCode;
            }
        }
        throw new IllegalArgumentException("창고 코드를 생성할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    }

    private boolean isZeroCode(String code) {
        return code != null && code.matches("0+");
    }

    private void validateGeneratedCode(String code) {
        if (code == null || !code.matches(GENERATED_CODE_PATTERN)) {
            throw new IllegalArgumentException("창고 코드 채번이 3자리 범위를 초과했습니다.");
        }
        int value = Integer.parseInt(code);
        if (value < 1 || value > 999) {
            throw new IllegalArgumentException("창고 코드 채번이 3자리 범위를 초과했습니다.");
        }
    }

    private Long findWarehouseIdByCode(
            Long tenantId,
            String warehouseCode,
            Long excludeWarehouseId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("warehouseCode", warehouseCode);
        params.put("excludeWarehouseId", excludeWarehouseId);
        return warehouseDAO.selectWarehouseIdByCode(params);
    }

    private WarehouseVO findByIdOrThrow(Long tenantId, Long warehouseId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("warehouseId", warehouseId);
        WarehouseVO warehouse = warehouseDAO.selectWarehouseById(params);
        if (warehouse == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "창고를 찾을 수 없습니다.");
        }
        return warehouse;
    }

    private String requireWarehouseName(String warehouseName) {
        if (!StringUtils.hasText(warehouseName)) {
            throw new IllegalArgumentException("창고명은 필수입니다.");
        }
        return warehouseName.trim();
    }

    private String normalizeFlag(String value, String defaultValue) {
        if (!StringUtils.hasText(value)) {
            return defaultValue;
        }
        String normalized = value.trim().toUpperCase(java.util.Locale.ROOT);
        if (!"Y".equals(normalized) && !"N".equals(normalized)) {
            throw new IllegalArgumentException("여부 값은 Y 또는 N이어야 합니다.");
        }
        return normalized;
    }

    private String normalizeSearchFlag(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String normalized = value.trim().toUpperCase(java.util.Locale.ROOT);
        if (!"Y".equals(normalized) && !"N".equals(normalized)) {
            throw new IllegalArgumentException("여부 값은 Y 또는 N이어야 합니다.");
        }
        return normalized;
    }

    private String normalizeText(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private void validatePayload(WarehouseSaveRequestVO payload) {
        if (payload == null) {
            throw new IllegalArgumentException("저장 요청이 비어 있습니다.");
        }
    }

    private void validateTenantId(Long tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("테넌트 정보가 없습니다.");
        }
    }

    private IllegalArgumentException duplicateCodeError() {
        return new IllegalArgumentException("이미 사용 중인 창고코드입니다.");
    }

    private IllegalArgumentException duplicateSaveError(DuplicateKeyException error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (!(cause instanceof PSQLException)) {
                continue;
            }
            PSQLException postgresError = (PSQLException) cause;
            if (postgresError.getServerErrorMessage() == null) {
                continue;
            }
            String constraint = postgresError.getServerErrorMessage().getConstraint();
            if ("uq_tb_warehouse_tenant_code".equals(constraint)) {
                return new IllegalArgumentException("이미 사용 중인 창고코드입니다.", error);
            }
        }
        return duplicateCodeError();
    }
}
