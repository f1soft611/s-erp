package egovframework.let.co.master.classification.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.co.master.classification.domain.model.ClassificationCreateRequestVO;
import egovframework.let.co.master.classification.domain.model.ClassificationKind;
import egovframework.let.co.master.classification.domain.model.ClassificationSaveRequestVO;
import egovframework.let.co.master.classification.domain.model.ClassificationVO;
import egovframework.let.co.master.classification.domain.repository.ClassificationDAO;
import egovframework.let.co.master.classification.service.ClassificationService;

@Service("classificationService")
public class ClassificationServiceImpl extends EgovAbstractServiceImpl implements ClassificationService {
    private final ClassificationDAO classificationDAO;

    public ClassificationServiceImpl(ClassificationDAO classificationDAO) {
        this.classificationDAO = classificationDAO;
    }

    @Override
    public List<ClassificationVO> list(ClassificationKind kind, Long tenantId) throws Exception {
        validateScope(kind, tenantId);
        return classificationDAO.selectList(kind, tenantId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ClassificationVO create(ClassificationKind kind, Long tenantId, String actorId,
            ClassificationCreateRequestVO payload) throws Exception {
        validateScope(kind, tenantId);
        Map<String, Object> values = validatedValues(payload, actorId, true);
        int level = 1;
        if (payload.getParentId() != null) {
            ClassificationVO parent = requireFound(
                    classificationDAO.selectForUpdate(kind, tenantId, payload.getParentId()));
            requireActiveParent(parent);
            if (parent.getLevel() >= kind.getMaximumLevel()) {
                throw new IllegalArgumentException("최대 분류 레벨 아래에는 하위 분류를 추가할 수 없습니다.");
            }
            level = parent.getLevel() + 1;
        }
        values.put("parentId", payload.getParentId());
        values.put("level", level);
        Long id = classificationDAO.insert(kind, tenantId, values);
        return requireFound(classificationDAO.selectById(kind, tenantId, id));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ClassificationVO update(ClassificationKind kind, Long tenantId, String actorId, Long id,
            ClassificationSaveRequestVO payload) throws Exception {
        validateScope(kind, tenantId);
        Map<String, Object> values = validatedValues(payload, actorId, false);
        ClassificationVO existing = requireFound(classificationDAO.selectForUpdate(kind, tenantId, id));
        if ("N".equals(values.get("useAt"))) {
            if (classificationDAO.countActiveChildren(kind, tenantId, id) > 0) {
                throw new IllegalArgumentException("활성 하위 분류가 있는 분류는 비활성화할 수 없습니다.");
            }
        } else if ("N".equals(existing.getUseAt()) && existing.getParentId() != null) {
            requireActiveParent(requireFound(
                    classificationDAO.selectForUpdate(kind, tenantId, existing.getParentId())));
        }
        if (classificationDAO.update(kind, tenantId, id, values) == 0) {
            throw notFound();
        }
        return requireFound(classificationDAO.selectById(kind, tenantId, id));
    }

    private void validateScope(ClassificationKind kind, Long tenantId) {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(tenantId, "tenantId");
    }

    private Map<String, Object> validatedValues(ClassificationSaveRequestVO payload, String actorId,
            boolean creating) {
        if (payload == null || payload.getName() == null || payload.getName().trim().isEmpty()
                || payload.getName().trim().length() > 50) {
            throw new IllegalArgumentException("분류명은 1~50자여야 합니다.");
        }
        int sortSeq = payload.getSortSeq() == null ? 0 : payload.getSortSeq();
        if (sortSeq < 0) {
            throw new IllegalArgumentException("정렬 순서는 0 이상이어야 합니다.");
        }
        String useAt = creating && payload.getUseAt() == null ? "Y" : payload.getUseAt();
        if (!"Y".equals(useAt) && !"N".equals(useAt)) {
            throw new IllegalArgumentException("사용 여부는 Y 또는 N이어야 합니다.");
        }
        Map<String, Object> values = new HashMap<>();
        values.put("name", payload.getName().trim());
        values.put("sortSeq", sortSeq);
        values.put("useAt", useAt);
        values.put("actorId", actorId);
        return values;
    }

    private void requireActiveParent(ClassificationVO parent) {
        if (!"Y".equals(parent.getUseAt())) {
            throw new IllegalArgumentException("상위 분류가 활성 상태여야 합니다.");
        }
    }

    private ClassificationVO requireFound(ClassificationVO node) {
        if (node == null) {
            throw notFound();
        }
        return node;
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "분류를 찾을 수 없습니다.");
    }
}
