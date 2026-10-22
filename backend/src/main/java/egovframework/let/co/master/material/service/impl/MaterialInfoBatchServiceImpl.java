package egovframework.let.co.master.material.service.impl;

import java.util.List;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import egovframework.let.co.master.material.domain.model.MaterialInfoBatchChangeSetVO;
import egovframework.let.co.master.material.domain.model.MaterialInfoBatchSaveRequestVO;
import egovframework.let.co.master.material.domain.model.MaterialInfoBatchSaveResultVO;
import egovframework.let.co.master.material.domain.model.MaterialInfoChangeVO;
import egovframework.let.co.master.material.service.MaterialInfoService;
import egovframework.let.co.master.material.service.MaterialInfoBatchService;

@Service("materialInfoBatchService")
public class MaterialInfoBatchServiceImpl extends EgovAbstractServiceImpl implements MaterialInfoBatchService {
    private final MaterialInfoService service;
    public MaterialInfoBatchServiceImpl(MaterialInfoService service) { this.service = service; }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MaterialInfoBatchSaveResultVO saveBatch(Long tenantId, String actor, MaterialInfoBatchSaveRequestVO payload) throws Exception {
        if (payload == null || payload.getMaterials() == null) throw new IllegalArgumentException("품목 변경 집합이 필요합니다.");
        MaterialInfoBatchChangeSetVO changes = payload.getMaterials();
        if (changes.getInsertedRows() == null || changes.getUpdatedRows() == null || changes.getDeletedRows() == null) {
            throw new IllegalArgumentException("품목 변경 배열은 null일 수 없습니다.");
        }
        if (!changes.getDeletedRows().isEmpty()) throw new IllegalArgumentException("품목 삭제는 지원하지 않습니다.");
        validateRows(changes.getInsertedRows(), false);
        validateRows(changes.getUpdatedRows(), true);
        MaterialInfoBatchSaveResultVO result = new MaterialInfoBatchSaveResultVO();
        for (MaterialInfoChangeVO row : changes.getInsertedRows()) {
            result.getMaterials().add(service.createMaterial(tenantId, actor, row));
        }
        for (MaterialInfoChangeVO row : changes.getUpdatedRows()) {
            result.getMaterials().add(service.updateMaterial(tenantId, actor, requireId(row.getMaterialId()), row));
        }
        return result;
    }

    private void validateRows(List<MaterialInfoChangeVO> rows, boolean update) {
        for (MaterialInfoChangeVO row : rows) {
            if (row == null) throw new IllegalArgumentException("품목 변경 행이 비어 있습니다.");
            if (!StringUtils.hasText(row.getMaterialName())) throw new IllegalArgumentException("품목명은 필수입니다.");
            if (!StringUtils.hasText(row.getMaterialTypeCode())) throw new IllegalArgumentException("품목계정코드는 필수입니다.");
            if (update) {
                requireId(row.getMaterialId());
                if (!StringUtils.hasText(row.getMaterialCode())) throw new IllegalArgumentException("품목코드는 필수입니다.");
            }
        }
    }

    private Long requireId(String raw) {
        if (raw != null && raw.trim().matches("[0-9]+")) {
            try {
                long id = Long.parseLong(raw.trim());
                if (id > 0) return id;
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException("품목 수정 시 올바른 ID가 필요합니다.", ex);
            }
        }
        throw new IllegalArgumentException("품목 수정 시 올바른 ID가 필요합니다.");
    }
}
