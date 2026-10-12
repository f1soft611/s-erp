package egovframework.let.groupware.approval.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.groupware.approval.domain.model.DocumentApprovalParticipantVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDetailVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalLineVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalSummaryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalWorkflowDocumentVO;

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

    public DocumentApprovalDraftVO selectDraftDocumentStatus(Map<String, Object> params) throws Exception {
        return (DocumentApprovalDraftVO) selectOne("DocumentApprovalDAO.selectDraftDocumentStatus", params);
    }

    public DocumentApprovalWorkflowDocumentVO selectDocumentApprovalForUpdate(Map<String, Object> params)
            throws Exception {
        return (DocumentApprovalWorkflowDocumentVO) selectOne(
                "DocumentApprovalDAO.selectDocumentApprovalForUpdate", params);
    }

    public int updateDocumentApprovalStatus(Map<String, Object> params) throws Exception {
        return update("DocumentApprovalDAO.updateDocumentApprovalStatus", params);
    }

    public DocumentApprovalLineVO selectCurrentPendingApprovalLine(Map<String, Object> params) throws Exception {
        return (DocumentApprovalLineVO) selectOne(
                "DocumentApprovalDAO.selectCurrentPendingApprovalLine", params);
    }

    public int updateApprovalLineAction(Map<String, Object> params) throws Exception {
        return update("DocumentApprovalDAO.updateApprovalLineAction", params);
    }

    public Long selectPendingApprovalCountForStage(Map<String, Object> params) throws Exception {
        return (Long) selectOne("DocumentApprovalDAO.selectPendingApprovalCountForStage", params);
    }

    public Integer selectNextWaitingApprovalStage(Map<String, Object> params) throws Exception {
        return (Integer) selectOne("DocumentApprovalDAO.selectNextWaitingApprovalStage", params);
    }

    public int activateApprovalStage(Map<String, Object> params) throws Exception {
        return update("DocumentApprovalDAO.activateApprovalStage", params);
    }

    public List<DocumentApprovalListItemVO> selectRelatedDocumentList(Map<String, Object> params) throws Exception {
        return selectList("DocumentApprovalDAO.selectRelatedDocumentList", params);
    }

    public DocumentApprovalSummaryVO selectDocumentApprovalSummary(Map<String, Object> params) throws Exception {
        return (DocumentApprovalSummaryVO) selectOne("DocumentApprovalDAO.selectDocumentApprovalSummary", params);
    }

    public List<DocumentApprovalListItemVO> selectApprovalNotices(Map<String, Object> params) throws Exception {
        return selectList("DocumentApprovalDAO.selectApprovalNotices", params);
    }

    public DocumentApprovalDetailVO selectDocumentApprovalDetail(Map<String, Object> params) throws Exception {
        return (DocumentApprovalDetailVO) selectOne("DocumentApprovalDAO.selectDocumentApprovalDetail", params);
    }

    public List<DocumentApprovalLineVO> selectApprovalLines(Map<String, Object> params) throws Exception {
        return selectList("DocumentApprovalDAO.selectApprovalLines", params);
    }

    public Boolean selectIsDocumentParticipant(Map<String, Object> params) throws Exception {
        return (Boolean) selectOne("DocumentApprovalDAO.selectIsDocumentParticipant", params);
    }
}
