package egovframework.let.quality.inspect.status.service;

import java.util.List;

import egovframework.let.quality.inspect.status.domain.model.MaterialInspectionStatusSearchVO;
import egovframework.let.quality.inspect.status.domain.model.MaterialInspectionStatusVO;

/**
 * 자재수입검사현황 조회 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
public interface MaterialInspectionStatusService {

    /** 검색 조건에 맞는 검사 품목 행을 조회한다. 상태 조건이 없으면 정상(ACTIVE)만 조회한다. */
    List<MaterialInspectionStatusVO> selectInspectionStatusList(Long tenantId,
            MaterialInspectionStatusSearchVO search) throws Exception;
}
