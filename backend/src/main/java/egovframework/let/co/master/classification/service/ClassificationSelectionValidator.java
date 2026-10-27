package egovframework.let.co.master.classification.service;

import java.util.Objects;
import org.springframework.stereotype.Component;
import egovframework.let.co.master.classification.domain.model.ClassificationKind;
import egovframework.let.co.master.classification.domain.model.ClassificationVO;
import egovframework.let.co.master.classification.domain.repository.ClassificationDAO;

@Component
public class ClassificationSelectionValidator {
    private final ClassificationDAO dao;

    public ClassificationSelectionValidator(ClassificationDAO dao) {
        this.dao = dao;
    }

    public void item(Long tenantId, Long id, Long previousId) throws Exception {
        validateId(id);
        if (id == null || Objects.equals(id, previousId)) return;
        ClassificationVO node = active(ClassificationKind.ITEM, tenantId, id);
        if (node.getLevel() == null || node.getLevel() < 1 || node.getLevel() > 3) throw invalid();
        int level = node.getLevel();
        while (level > 1) {
            node = active(ClassificationKind.ITEM, tenantId, node.getParentId());
            if (!Integer.valueOf(--level).equals(node.getLevel())) throw invalid();
        }
        if (node.getParentId() != null) throw invalid();
    }

    public void partner(Long tenantId, Long first, Long second, Long previousFirst, Long previousSecond)
            throws Exception {
        validateId(first);
        validateId(second);
        if (Objects.equals(first, previousFirst) && Objects.equals(second, previousSecond)) return;
        if (first == null) {
            if (second != null) throw invalid();
            return;
        }
        ClassificationVO root = active(ClassificationKind.PARTNER, tenantId, first);
        if (!Integer.valueOf(1).equals(root.getLevel()) || root.getParentId() != null) throw invalid();
        if (second != null) {
            ClassificationVO child = active(ClassificationKind.PARTNER, tenantId, second);
            if (!Integer.valueOf(2).equals(child.getLevel()) || !first.equals(child.getParentId())) throw invalid();
        }
    }

    private ClassificationVO active(ClassificationKind kind, Long tenantId, Long id) throws Exception {
        if (id == null) throw invalid();
        ClassificationVO row = dao.selectById(kind, tenantId, id);
        if (row == null || !"Y".equals(row.getUseAt())) throw invalid();
        return row;
    }

    private void validateId(Long id) {
        if (id != null && (id <= 0 || id > 9007199254740991L)) throw invalid();
    }

    private IllegalArgumentException invalid() {
        return new IllegalArgumentException("선택할 수 없는 분류입니다. 사용 여부와 상위 분류를 확인해 주세요.");
    }
}
