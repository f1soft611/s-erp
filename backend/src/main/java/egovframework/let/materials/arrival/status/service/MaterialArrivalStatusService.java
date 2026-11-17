package egovframework.let.materials.arrival.status.service;

import java.util.List;

import egovframework.let.materials.arrival.status.domain.model.MaterialArrivalStatusSearchVO;
import egovframework.let.materials.arrival.status.domain.model.MaterialArrivalStatusVO;

/**
 * 가입고현황 조회 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
public interface MaterialArrivalStatusService {

    List<MaterialArrivalStatusVO> selectArrivalStatusList(Long tenantId, MaterialArrivalStatusSearchVO search)
            throws Exception;
}
