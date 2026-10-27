package egovframework.let.co.master.classification.service;

import java.util.List;

import egovframework.let.co.master.classification.domain.model.ClassificationCreateRequestVO;
import egovframework.let.co.master.classification.domain.model.ClassificationKind;
import egovframework.let.co.master.classification.domain.model.ClassificationSaveRequestVO;
import egovframework.let.co.master.classification.domain.model.ClassificationVO;

public interface ClassificationService {
    List<ClassificationVO> list(ClassificationKind kind, Long tenantId) throws Exception;

    ClassificationVO create(ClassificationKind kind, Long tenantId, String actorId,
            ClassificationCreateRequestVO payload) throws Exception;

    ClassificationVO update(ClassificationKind kind, Long tenantId, String actorId, Long id,
            ClassificationSaveRequestVO payload) throws Exception;
}
