package egovframework.let.quality.inspect.create.service;

import java.time.LocalDate;
import java.util.List;

import egovframework.let.quality.inspect.create.domain.model.QualityInspectionCandidateVO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionSaveRequestVO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionVO;

/**
 * 자재 수입검사 후보 조회와 등록·조회·수정·취소 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
public interface QualityInspectionService {

    /** 검사 대기량이 남은 가입고 행(검사 대상, 정상 가입고)을 조회한다. */
    List<QualityInspectionCandidateVO> listCandidates(Long tenantId, LocalDate fromDt, LocalDate toDt,
            String supplierKeyword, String materialKeyword, String keyword) throws Exception;

    /** 조회 조건과 무관하게 검사 대기량이 남은 가입고 행의 전체 건수. */
    int countWaiting(Long tenantId) throws Exception;

    QualityInspectionVO getInspection(Long tenantId, Long qualityInspectionId) throws Exception;

    /** 가입고 행 여러 개를 한 검사번호로 묶어 등록한다. */
    QualityInspectionVO createInspection(Long tenantId, String userId, QualityInspectionSaveRequestVO payload)
            throws Exception;

    /** 검사일·검사자·비고와 기존 행의 수량·비고를 수정하고, 요청에 없는 행은 삭제한다. */
    QualityInspectionVO updateInspection(Long tenantId, String userId, Long qualityInspectionId,
            QualityInspectionSaveRequestVO payload) throws Exception;

    /** 검사 전체를 취소한다(이력 보존). 취소하면 가입고 잠금과 검사 대기량이 복구된다. */
    QualityInspectionVO cancelInspection(Long tenantId, String userId, Long qualityInspectionId) throws Exception;
}
