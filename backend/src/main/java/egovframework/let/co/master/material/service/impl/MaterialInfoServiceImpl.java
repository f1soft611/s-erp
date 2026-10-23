package egovframework.let.co.master.material.service.impl;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import egovframework.let.co.master.material.domain.model.MaterialInfoVO;
import egovframework.let.co.master.material.domain.model.MaterialInfoOptionVO;
import egovframework.let.co.master.material.domain.model.MaterialInfoSaveRequestVO;
import egovframework.let.co.master.material.domain.model.MaterialInfoSearchCondition;
import egovframework.let.co.master.material.domain.repository.MaterialInfoDAO;
import egovframework.let.co.master.material.service.MaterialInfoService;

@Service("materialInfoService")
public class MaterialInfoServiceImpl extends EgovAbstractServiceImpl implements MaterialInfoService {
    private static final Set<String> EXPIRY_STATUSES = Collections.unmodifiableSet(
            new HashSet<>(Arrays.asList("NONE", "DAY", "MONTH", "YEAR")));
    private final MaterialInfoDAO dao;
    private final EgovIdGnrService generator;

    public MaterialInfoServiceImpl(MaterialInfoDAO dao,
            @Qualifier("materialCodeIdGnrService") EgovIdGnrService generator) {
        this.dao = dao;
        this.generator = generator;
    }

    private Map<String, Object> tenantParams(Long tenantId) {
        if (tenantId == null || tenantId <= 0) throw new IllegalArgumentException("테넌트 정보가 필요합니다.");
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        return params;
    }

    @Override
    public List<MaterialInfoVO> listMaterials(Long tenantId, MaterialInfoSearchCondition c) throws Exception {
        Map<String, Object> p = tenantParams(tenantId);
        if (c != null) {
            putSearch(p, "keyword", c.getKeyword());
            putSearch(p, "materialSpec", c.getMaterialSpec());
            putSearch(p, "materialTypeCode", c.getMaterialTypeCode());
            putSearch(p, "matCataType", c.getMatCataType());
            putSearch(p, "customerCode", c.getCustomerCode());
            putSearch(p, "warehouseCode", c.getWarehouseCode());
            putSearch(p, "itemBarcode", c.getItemBarcode());
            putSearch(p, "materialKind", c.getMaterialKind());
            putSearch(p, "storeMethod", c.getStoreMethod());
            if (StringUtils.hasText(c.getExpiryedStatus())) {
                p.put("expiryedStatus", expiryStatus(c.getExpiryedStatus()));
            }
        }
        return dao.selectMaterialList(p);
    }

    @Override
    public List<MaterialInfoOptionVO> listOptions(Long tenantId) throws Exception {
        return dao.selectMaterialOptions(tenantParams(tenantId));
    }

    private void putSearch(Map<String, Object> params, String field, String value) {
        if (StringUtils.hasText(value)) params.put(field, value.trim());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MaterialInfoVO createMaterial(Long tenantId, String actor, MaterialInfoSaveRequestVO payload) throws Exception {
        Map<String, Object> params = saveParams(tenantId, actor, payload, true);
        params.put("materialCode", resolveCode(tenantId, (String) params.get("materialCode"), null));
        Long id;
        try {
            id = dao.insertMaterial(params);
        } catch (DuplicateKeyException ex) {
            throw duplicateCode();
        }
        if (id == null) throw new IllegalStateException("품목 등록 결과를 확인할 수 없습니다.");
        return findById(tenantId, id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MaterialInfoVO updateMaterial(Long tenantId, String actor, Long id, MaterialInfoSaveRequestVO payload) throws Exception {
        Map<String, Object> params = saveParams(tenantId, actor, payload, false);
        if (id == null || id <= 0) throw new IllegalArgumentException("올바른 품목 ID가 필요합니다.");
        findById(tenantId, id);
        params.put("materialCode", resolveCode(tenantId, (String) params.get("materialCode"), id));
        params.put("materialId", id);
        try {
            if (dao.updateMaterial(params) == 0) throw notFound();
        } catch (DuplicateKeyException ex) {
            throw duplicateCode();
        }
        return findById(tenantId, id);
    }

    private MaterialInfoVO findById(Long tenantId, Long id) throws Exception {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("materialId", id);
        MaterialInfoVO row = dao.selectMaterialById(params);
        if (row == null) throw notFound();
        return row;
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "품목을 찾을 수 없습니다.");
    }

    private IllegalArgumentException duplicateCode() {
        return new IllegalArgumentException("이미 사용 중인 품목코드입니다.");
    }

    private String resolveCode(Long tenantId, String code, Long excludeId) throws Exception {
        if (!code.isEmpty()) {
            if (codeExists(tenantId, code, excludeId)) throw duplicateCode();
            return code;
        }
        for (int attempt = 0; attempt < 10; attempt++) {
            String next = generator.getNextStringId();
            if ("000000".equals(next)) {
                throw new IllegalArgumentException("품목코드 IDS 초기화 SQL을 먼저 적용해 주세요.");
            }
            if (next == null || !next.matches("[0-9]{6}")) {
                throw new IllegalArgumentException("품목코드 자동채번 범위(000001~999999)를 초과했습니다.");
            }
            if (!codeExists(tenantId, next, null)) return next;
        }
        throw new IllegalArgumentException("품목코드를 생성할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    }

    private boolean codeExists(Long tenantId, String code, Long excludeId) throws Exception {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("materialCode", code);
        params.put("excludeMaterialId", excludeId);
        return dao.selectMaterialIdByCode(params) != null;
    }

    private String expiryStatus(String value) {
        String result = StringUtils.hasText(value) ? value.trim() : "NONE";
        if (!EXPIRY_STATUSES.contains(result)) throw new IllegalArgumentException("소비기한기준은 NONE/DAY/MONTH/YEAR 중 하나여야 합니다.");
        return result;
    }

    private void putText(Map<String, Object> params, String field, String label, String raw, int max, boolean required) {
        String value = raw == null ? "" : raw.trim();
        if (required && value.isEmpty()) throw new IllegalArgumentException(label + "은 필수입니다.");
        if (value.codePointCount(0, value.length()) > max) {
            throw new IllegalArgumentException(label + "은 " + max + "자 이하로 입력해 주세요.");
        }
        params.put(field, value);
    }

    private Map<String, Object> saveParams(Long tenantId, String actor, MaterialInfoSaveRequestVO p, boolean isNew) {
        Map<String, Object> params = tenantParams(tenantId);
        if (p == null) throw new IllegalArgumentException("품목 저장 요청이 비어 있습니다.");
        putText(params, "materialCode", "품목코드", p.getMaterialCode(), 20, !isNew);
        putText(params, "materialName", "품목명", p.getMaterialName(), 200, true);
        putText(params, "materialEngName", "품목영문명", p.getMaterialEngName(), 200, false);
        putText(params, "materialModelName", "품목모델명", p.getMaterialModelName(), 200, false);
        putText(params, "materialSpec", "품목규격", p.getMaterialSpec(), 100, false);
        putText(params, "materialSpec2", "품목규격2", p.getMaterialSpec2(), 100, false);
        putText(params, "unit", "단위", p.getUnit(), 6, false);
        putText(params, "materialTypeCode", "품목계정코드", p.getMaterialTypeCode(), 14, true);
        putText(params, "customerCode", "제조사 코드", p.getCustomerCode(), 10, false);
        putText(params, "accountingCode", "회계코드", p.getAccountingCode(), 7, false);
        putText(params, "warehouseCode", "창고코드", p.getWarehouseCode(), 10, false);
        putText(params, "drawing", "도면번호", p.getDrawing(), 10, false);
        putText(params, "etc", "비고", p.getEtc(), 100, false);
        putText(params, "partNo", "Part No", p.getPartNo(), 30, false);
        putText(params, "manufactory", "제조", p.getManufactory(), 100, false);
        putText(params, "matCataType", "품목분류", p.getMatCataType(), 10, false);
        putText(params, "location", "위치정보", p.getLocation(), 1000, false);
        putText(params, "itemType", "품목계정", p.getItemType(), 10, false);
        putText(params, "searchItemName", "통합검색명칭", p.getSearchItemName(), 200, false);
        putText(params, "materialQuality", "품목재질", p.getMaterialQuality(), 6, false);
        putText(params, "itemBarcode", "품목바코드", p.getItemBarcode(), 20, false);
        putText(params, "materialNo", "품목번호", p.getMaterialNo(), 20, false);
        putText(params, "materialKind", "품목유형", p.getMaterialKind(), 50, false);
        putText(params, "storeMethod", "보관방법", p.getStoreMethod(), 50, false);
        putText(params, "kfdaReportNo", "품목보고번호", p.getKfdaReportNo(), 20, false);
        putText(params, "createdBy", "등록자", actor, 10, true);
        putText(params, "updatedBy", "수정자", actor, 10, true);
        if (p.getSafeInvoice() != null && !Double.isFinite(p.getSafeInvoice())) {
            throw new IllegalArgumentException("안전재고는 유한한 숫자여야 합니다.");
        }
        if (p.getMaterialWeight() != null && (p.getMaterialWeight() < -9007199254740991L
                || p.getMaterialWeight() > 9007199254740991L)) {
            throw new IllegalArgumentException("중량은 안전한 정수 범위여야 합니다.");
        }
        if (p.getExpiryedCount() != null && p.getExpiryedCount() <= 0) {
            throw new IllegalArgumentException("소비기한계산숫자는 양의 정수여야 합니다.");
        }
        params.put("materialWeight", p.getMaterialWeight());
        params.put("safeInvoice", p.getSafeInvoice());
        params.put("expiryedStatus", expiryStatus(p.getExpiryedStatus()));
        params.put("expiryedCount", p.getExpiryedCount());
        return params;
    }
}
