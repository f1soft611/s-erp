package egovframework.let.hr.order.service.impl;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.hr.employee.domain.model.EmployeeSaveRequestVO;
import egovframework.let.hr.employee.domain.model.EmployeeVO;
import egovframework.let.hr.employee.service.EmployeeService;
import egovframework.let.hr.order.domain.model.HrOrderChange;
import egovframework.let.hr.order.domain.model.HrOrderField;
import egovframework.let.hr.order.domain.model.HrOrderHistoryVO;
import egovframework.let.hr.order.domain.model.HrOrderProcessRequestVO;
import egovframework.let.hr.order.domain.model.HrOrderProcessResultVO;
import egovframework.let.hr.order.domain.model.HrOrderType;
import egovframework.let.hr.order.domain.model.HrOrderTypeVO;
import egovframework.let.hr.order.domain.repository.HrOrderDAO;
import egovframework.let.hr.order.service.HrOrderHistoryRecorder;
import egovframework.let.hr.order.service.HrOrderService;

@Service("hrOrderService")
public class HrOrderServiceImpl implements HrOrderService {

    private static final String STATUS_RETIRED = "RETIRED";
    private static final String STATUS_LEAVE = "LEAVE";

    private final EmployeeService employeeService;
    private final HrOrderHistoryRecorder historyRecorder;
    private final HrOrderDAO hrOrderDAO;

    public HrOrderServiceImpl(EmployeeService employeeService, HrOrderHistoryRecorder historyRecorder, HrOrderDAO hrOrderDAO) {
        this.employeeService = employeeService;
        this.historyRecorder = historyRecorder;
        this.hrOrderDAO = hrOrderDAO;
    }

    @Override
    public List<HrOrderTypeVO> listTypes() {
        List<HrOrderTypeVO> types = new ArrayList<>();
        for (HrOrderType type : HrOrderType.values()) {
            if (type.isSelectable()) {
                types.add(HrOrderTypeVO.of(type));
            }
        }
        return types;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public HrOrderProcessResultVO process(Long tenantId, Long actorUserId, HrOrderProcessRequestVO request) throws Exception {
        if (tenantId == null) {
            throw new IllegalArgumentException("테넌트 정보가 없습니다.");
        }
        if (request == null) {
            throw new IllegalArgumentException("처리 요청이 비어 있습니다.");
        }
        HrOrderType type = HrOrderType.selectableOf(request.getOrderType());
        if (type == null) {
            throw new IllegalArgumentException("명령 유형을 선택해 주세요.");
        }
        LocalDate orderDt = parseOrderDate(request.getOrderDt());
        List<HrOrderProcessRequestVO.Item> items = request.getItems();
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("대상 사원을 선택해 주세요.");
        }
        Set<Long> seen = new HashSet<>();
        for (HrOrderProcessRequestVO.Item item : items) {
            if (item == null || item.getUserId() == null) {
                throw new IllegalArgumentException("대상 사원 정보가 올바르지 않습니다.");
            }
            if (!seen.add(item.getUserId())) {
                throw new IllegalArgumentException("같은 사원이 중복되어 있습니다.");
            }
        }

        List<HrOrderChange> changes = new ArrayList<>();
        HrOrderProcessResultVO result = new HrOrderProcessResultVO();
        for (HrOrderProcessRequestVO.Item item : items) {
            EmployeeVO existing = employeeService.getEmployee(tenantId, item.getUserId());
            try {
                String postValue = resolvePostValue(type, item.getPostValue(), orderDt);
                HrOrderChange change = apply(tenantId, actorUserId, type, existing, postValue);
                changes.add(change);
                for (HrOrderChange.Field field : change.getFields()) {
                    HrOrderProcessResultVO.Item resultItem = new HrOrderProcessResultVO.Item();
                    resultItem.setUserId(existing.getUserId());
                    resultItem.setUserNm(existing.getUserNm());
                    resultItem.setFieldCode(field.getField().name());
                    resultItem.setPreName(field.getPreName());
                    resultItem.setPostName(field.getPostName());
                    result.getItems().add(resultItem);
                }
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException(prefix(existing) + ex.getMessage(), ex);
            } catch (ResponseStatusException ex) {
                throw new ResponseStatusException(ex.getStatus(), prefix(existing) + ex.getReason(), ex);
            }
        }
        result.setOrderId(historyRecorder.recordOrder(tenantId, actorUserId, type, orderDt, request.getRemark(), changes));
        result.setCount(changes.size());
        return result;
    }

    @Override
    public List<HrOrderHistoryVO> listHistory(Long tenantId, String from, String to, String keyword, String orderType,
            String source) throws Exception {
        if (tenantId == null) {
            throw new IllegalArgumentException("테넌트 정보가 없습니다.");
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        if (StringUtils.hasText(from)) {
            params.put("fromDt", Timestamp.valueOf(parseDate("조회 시작일", from).atStartOfDay()));
        }
        if (StringUtils.hasText(to)) {
            params.put("toDt", Timestamp.valueOf(parseDate("조회 종료일", to).plusDays(1).atStartOfDay()));
        }
        if (StringUtils.hasText(keyword)) {
            params.put("keyword", keyword.trim());
        }
        if (StringUtils.hasText(orderType)) {
            params.put("orderType", orderType.trim());
        }
        if (StringUtils.hasText(source)) {
            params.put("source", source.trim());
        }
        List<HrOrderHistoryVO> rows = hrOrderDAO.selectHistory(params);
        if (rows == null) {
            return new ArrayList<>();
        }
        for (HrOrderHistoryVO row : rows) {
            row.setOrderTypeName(HrOrderType.labelOf(row.getOrderType()));
            row.setFieldName(HrOrderField.labelOf(row.getFieldCode()));
        }
        return rows;
    }

    // ---- 유형별 적용 ----

    /** 사원 1명에 명령을 적용하고 이력에 남길 변경 내용을 돌려준다. */
    private HrOrderChange apply(Long tenantId, Long actorUserId, HrOrderType type, EmployeeVO existing, String postValue)
            throws Exception {
        if (STATUS_RETIRED.equals(existing.getEmploymentStatus())) {
            throw new IllegalArgumentException("퇴직한 사원은 인사명령을 처리할 수 없습니다.");
        }
        EmployeeSaveRequestVO payload = toSaveRequest(existing);
        switch (type) {
            case TRANSFER:
                payload.setDepartmentId(parseId("부서", postValue));
                break;
            case PROMOTION:
                payload.setPositionCode(postValue);
                break;
            case GRADE_UP:
                payload.setLevelId(parseId("직급", postValue));
                break;
            case EMPLOYMENT_TYPE_CHANGE:
                payload.setEmploymentTypeCode(postValue);
                break;
            case LEAVE:
                if (STATUS_LEAVE.equals(existing.getEmploymentStatus())) {
                    throw new IllegalArgumentException("이미 휴직 중인 사원입니다.");
                }
                payload.setSuspendDt(parseDate("휴직일", postValue).toString());
                payload.setBackDt(null);
                break;
            case RETURN:
                if (!STATUS_LEAVE.equals(existing.getEmploymentStatus())) {
                    throw new IllegalArgumentException("휴직 중인 사원만 복직 처리할 수 있습니다.");
                }
                payload.setBackDt(parseDate("복직일", postValue).toString());
                break;
            case RETIRE:
                payload.setRetireDt(parseDate("퇴직일", postValue).toString());
                break;
            default:
                throw new IllegalArgumentException("명령 유형을 선택해 주세요.");
        }
        HrOrderField field = type.getField();
        if (!type.isDateInput() && postValue.equals(field.valueOf(existing))) {
            throw new IllegalArgumentException("현재와 같은 " + field.getLabel() + "입니다.");
        }

        EmployeeVO updated = employeeService.updateEmployee(tenantId, actorUserId, existing.getUserId(), payload, false);

        HrOrderChange change = new HrOrderChange(existing.getUserId());
        change.add(field, field.valueOf(existing), field.nameOf(existing), field.valueOf(updated), field.nameOf(updated));
        if (type == HrOrderType.LEAVE && StringUtils.hasText(existing.getBackDt())) {
            // 재휴직이면 이전 복직일을 비운다. 이 변화도 이력에 남긴다.
            change.add(HrOrderField.BACK_DT, existing.getBackDt(), existing.getBackDt(), null, null);
        }
        return change;
    }

    private EmployeeSaveRequestVO toSaveRequest(EmployeeVO source) {
        EmployeeSaveRequestVO payload = new EmployeeSaveRequestVO();
        payload.setEmployeeNo(source.getEmployeeNo());
        payload.setUserNm(source.getUserNm());
        payload.setEnglishNm(source.getEnglishNm());
        payload.setDepartmentId(source.getDepartmentId());
        payload.setPositionCode(source.getPositionCode());
        payload.setLevelId(source.getLevelId());
        payload.setGenderCode(source.getGenderCode());
        payload.setEmploymentTypeCode(source.getEmploymentTypeCode());
        payload.setNativeTypeCode(source.getNativeTypeCode());
        payload.setNationalityCode(source.getNationalityCode());
        payload.setBirthCalendarCode(source.getBirthCalendarCode());
        payload.setBirthDt(source.getBirthDt());
        payload.setJoinDt(source.getJoinDt());
        payload.setRetireDt(source.getRetireDt());
        payload.setSuspendDt(source.getSuspendDt());
        payload.setBackDt(source.getBackDt());
        payload.setWorkEndDt(source.getWorkEndDt());
        payload.setAdmissionDt(source.getAdmissionDt());
        payload.setStayFromDt(source.getStayFromDt());
        payload.setStayToDt(source.getStayToDt());
        payload.setContractFromDt(source.getContractFromDt());
        payload.setContractToDt(source.getContractToDt());
        payload.setMobileNo(source.getMobileNo());
        payload.setHomePhoneNo(source.getHomePhoneNo());
        payload.setEmailAddr(source.getEmailAddr());
        payload.setPostalCode(source.getPostalCode());
        payload.setAddress(source.getAddress());
        payload.setAddressDetail(source.getAddressDetail());
        payload.setRealUserAt(source.getRealUserAt());
        // 주민등록번호·사진·계정 입력값은 비워 기존 값을 유지한다.
        return payload;
    }

    // ---- 값 처리 ----

    private String resolvePostValue(HrOrderType type, String postValue, LocalDate orderDt) {
        if (StringUtils.hasText(postValue)) {
            return postValue.trim();
        }
        if (type.isDateInput()) {
            return orderDt.toString();
        }
        throw new IllegalArgumentException("명령 후 " + type.getField().getLabel() + " 값을 입력해 주세요.");
    }

    private LocalDate parseOrderDate(String value) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException("명령일을 입력해 주세요.");
        }
        LocalDate date = parseDate("명령일", value);
        if (date.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("명령일은 오늘 이후로 입력할 수 없습니다.");
        }
        return date;
    }

    private LocalDate parseDate(String label, String value) {
        try {
            return LocalDate.parse(value == null ? "" : value.trim());
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(label + " 형식이 올바르지 않습니다. (yyyy-MM-dd)");
        }
    }

    private Long parseId(String label, String value) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(label + " 값이 올바르지 않습니다.");
        }
    }

    private String prefix(EmployeeVO employee) {
        return (StringUtils.hasText(employee.getUserNm()) ? employee.getUserNm().trim() : String.valueOf(employee.getUserId())) + ": ";
    }
}
