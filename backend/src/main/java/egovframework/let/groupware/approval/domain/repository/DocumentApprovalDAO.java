package egovframework.let.groupware.approval.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.groupware.approval.domain.model.DocumentApprovalParticipantVO;

@Repository("documentApprovalDAO")
public class DocumentApprovalDAO extends EgovAbstractMapper {

    public Boolean selectActiveDraftingCategory(Map<String, Object> params) throws Exception {
        return (Boolean) selectOne("DocumentApprovalDAO.selectActiveDraftingCategory", params);
    }

    public List<DocumentApprovalParticipantVO> selectActiveParticipants(Map<String, Object> params) throws Exception {
        return selectList("DocumentApprovalDAO.selectActiveParticipants", params);
    }

    public Long insertDocumentApprovalMain(Map<String, Object> params) throws Exception {
        return (Long) selectOne("DocumentApprovalDAO.insertDocumentApprovalMain", params);
    }

    public int updateDocumentApprovalMain(Map<String, Object> params) throws Exception {
        return update("DocumentApprovalDAO.updateDocumentApprovalMain", params);
    }

    public int deleteDocumentApprovalLines(Map<String, Object> params) throws Exception {
        return delete("DocumentApprovalDAO.deleteDocumentApprovalLines", params);
    }

    public int insertDocumentApprovalLine(Map<String, Object> params) throws Exception {
        return insert("DocumentApprovalDAO.insertDocumentApprovalLine", params);
    }

    public String selectDraftDrafterId(Map<String, Object> params) throws Exception {
        return (String) selectOne("DocumentApprovalDAO.selectDraftDrafterId", params);
    }
}
