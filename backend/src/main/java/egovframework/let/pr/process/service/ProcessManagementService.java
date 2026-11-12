package egovframework.let.pr.process.service;

import java.util.List;
import egovframework.let.pr.process.domain.model.ProcessChangesVO;
import egovframework.let.pr.process.domain.model.ProcessNodeVO;

public interface ProcessManagementService {
    List<ProcessNodeVO> list(Long tenantId);
    List<ProcessNodeVO> save(Long tenantId, ProcessChangesVO changes);
}
