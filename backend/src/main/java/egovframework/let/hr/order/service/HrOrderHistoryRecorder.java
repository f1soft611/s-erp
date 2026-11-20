package egovframework.let.hr.order.service;

import java.time.LocalDate;
import java.util.List;

import egovframework.let.hr.employee.domain.model.EmployeeVO;
import egovframework.let.hr.order.domain.model.HrOrderChange;
import egovframework.let.hr.order.domain.model.HrOrderType;

/**
 * 인사명령 이력 기록. 사원 서비스(신규 등록·직접 수정)와 인사명령 처리가 같은 트랜잭션 안에서 호출한다.
 * 이력은 추가만 하며 수정·삭제하지 않는다.
 */
public interface HrOrderHistoryRecorder {

    /** 신규 등록 이력(출처 JOIN, 명령일은 입사일): 입사일·부서·직위. */
    void recordJoin(Long tenantId, Long actorUserId, EmployeeVO created) throws Exception;

    /** 사원관리 직접 수정 이력(출처 DIRECT, 명령일은 오늘): 추적 항목 중 실제로 바뀐 것만. 바뀐 것이 없으면 기록하지 않는다. */
    void recordDirectEdit(Long tenantId, Long actorUserId, EmployeeVO before, EmployeeVO after) throws Exception;

    /** 인사명령 처리 이력(출처 ORDER): 헤더 1건과 사원별 변경항목. 만든 명령 ID를 돌려준다. */
    Long recordOrder(Long tenantId, Long actorUserId, HrOrderType type, LocalDate orderDt, String remark,
            List<HrOrderChange> changes) throws Exception;
}
