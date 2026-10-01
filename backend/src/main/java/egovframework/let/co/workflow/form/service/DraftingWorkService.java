package egovframework.let.co.workflow.form.service;

import java.util.List;

import egovframework.let.co.workflow.form.domain.model.DraftingWorkUserOptionVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkSaveRequestVO;

public interface DraftingWorkService {

    List<DraftingWorkUserOptionVO> listUserOptions(Long tenantId) throws Exception;

    List<DraftingWorkVO> listWorks(
            Long tenantId,
            String keyword,
            Long categoryItemId,
            Long regTermId,
            String useAt) throws Exception;

    DraftingWorkVO createWork(Long tenantId, Long actorUserId, DraftingWorkSaveRequestVO payload) throws Exception;

    DraftingWorkVO updateWork(Long tenantId, Long actorUserId, Long draftingWorkCategoryId,
            DraftingWorkSaveRequestVO payload) throws Exception;
}