package egovframework.let.hr.order.service;

import java.util.List;

import egovframework.let.hr.order.domain.model.HrOrderHistoryVO;
import egovframework.let.hr.order.domain.model.HrOrderProcessRequestVO;
import egovframework.let.hr.order.domain.model.HrOrderProcessResultVO;
import egovframework.let.hr.order.domain.model.HrOrderTypeVO;

public interface HrOrderService {

    /** 화면에서 고를 수 있는 명령 유형. */
    List<HrOrderTypeVO> listTypes();

    /**
     * 인사명령 처리(즉시 반영). 대상 사원마다 사원 서비스로 값을 바꾸고 이력을 남기며, 한 명이라도 실패하면 전체를 취소한다.
     * 오류 메시지 앞에 사원명이 붙는다.
     */
    HrOrderProcessResultVO process(Long tenantId, Long actorUserId, HrOrderProcessRequestVO request) throws Exception;

    /**
     * 처리 내역(사원별 변경항목, 처리일시 내림차순, 최대 500건). from·to는 yyyy-MM-dd(처리일, 둘 다 포함)이며 비우면 제한 없음.
     * keyword는 사원명·사번, orderType·source는 정확히 일치.
     */
    List<HrOrderHistoryVO> listHistory(Long tenantId, String from, String to, String keyword, String orderType, String source)
            throws Exception;
}
