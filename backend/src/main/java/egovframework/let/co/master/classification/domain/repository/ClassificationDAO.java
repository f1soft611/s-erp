package egovframework.let.co.master.classification.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.master.classification.domain.model.ClassificationKind;
import egovframework.let.co.master.classification.domain.model.ClassificationVO;

@Repository("classificationDAO")
public class ClassificationDAO extends EgovAbstractMapper {

    public List<ClassificationVO> selectList(ClassificationKind kind, Long tenantId) throws Exception {
        return selectList(statement(kind, "selectList"), parameters(tenantId, null));
    }

    public ClassificationVO selectById(ClassificationKind kind, Long tenantId, Long id) throws Exception {
        return selectOne(statement(kind, "selectById"), parameters(tenantId, id));
    }

    public ClassificationVO selectForUpdate(ClassificationKind kind, Long tenantId, Long id) throws Exception {
        return selectOne(statement(kind, "selectForUpdate"), parameters(tenantId, id));
    }

    public int countActiveChildren(ClassificationKind kind, Long tenantId, Long id) throws Exception {
        return selectOne(statement(kind, "countActiveChildren"), parameters(tenantId, id));
    }

    public Long insert(ClassificationKind kind, Long tenantId, Map<String, Object> values) throws Exception {
        Map<String, Object> params = new HashMap<>(values);
        params.putAll(parameters(tenantId, null));
        return selectOne(statement(kind, "insert"), params);
    }

    public int update(ClassificationKind kind, Long tenantId, Long id, Map<String, Object> values) throws Exception {
        Map<String, Object> params = new HashMap<>(values);
        params.putAll(parameters(tenantId, id));
        return update(statement(kind, "update"), params);
    }

    private String statement(ClassificationKind kind, String operation) {
        return "ClassificationDAO." + Objects.requireNonNull(kind, "kind").getStatementPrefix() + "_" + operation;
    }

    private Map<String, Object> parameters(Long tenantId, Long id) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", Objects.requireNonNull(tenantId, "tenantId"));
        params.put("id", id);
        return params;
    }
}
