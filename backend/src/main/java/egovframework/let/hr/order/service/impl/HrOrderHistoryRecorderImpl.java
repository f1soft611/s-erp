package egovframework.let.hr.order.service.impl;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import egovframework.let.hr.employee.domain.model.EmployeeVO;
import egovframework.let.hr.order.domain.model.HrOrderChange;
import egovframework.let.hr.order.domain.model.HrOrderField;
import egovframework.let.hr.order.domain.model.HrOrderType;
import egovframework.let.hr.order.domain.repository.HrOrderDAO;
import egovframework.let.hr.order.service.HrOrderHistoryRecorder;

@Service("hrOrderHistoryRecorder")
public class HrOrderHistoryRecorderImpl implements HrOrderHistoryRecorder {

    static final String SOURCE_ORDER = "ORDER";
    static final String SOURCE_DIRECT = "DIRECT";
    static final String SOURCE_JOIN = "JOIN";
    private static final int MAX_REMARK_LENGTH = 500;

    private final HrOrderDAO hrOrderDAO;

    public HrOrderHistoryRecorderImpl(HrOrderDAO hrOrderDAO) {
        this.hrOrderDAO = hrOrderDAO;
    }

    @Override
    public void recordJoin(Long tenantId, Long actorUserId, EmployeeVO created) throws Exception {
        if (created == null || created.getUserId() == null || !StringUtils.hasText(created.getJoinDt())) {
            return;
        }
        HrOrderChange change = new HrOrderChange(created.getUserId());
        for (HrOrderField field : new HrOrderField[] {HrOrderField.JOIN_DT, HrOrderField.DEPARTMENT, HrOrderField.POSITION}) {
            String value = field.valueOf(created);
            if (value != null) {
                change.add(field, null, null, value, field.nameOf(created));
            }
        }
        if (change.getFields().isEmpty()) {
            return;
        }
        List<HrOrderChange> changes = new ArrayList<>();
        changes.add(change);
        write(tenantId, actorUserId, HrOrderType.JOIN, SOURCE_JOIN, LocalDate.parse(created.getJoinDt()), null, changes);
    }

    @Override
    public void recordDirectEdit(Long tenantId, Long actorUserId, EmployeeVO before, EmployeeVO after) throws Exception {
        if (before == null || after == null || after.getUserId() == null) {
            return;
        }
        HrOrderChange change = new HrOrderChange(after.getUserId());
        for (HrOrderField field : HrOrderField.values()) {
            String preValue = field.valueOf(before);
            String postValue = field.valueOf(after);
            if (!Objects.equals(preValue, postValue)) {
                change.add(field, preValue, field.nameOf(before), postValue, field.nameOf(after));
            }
        }
        if (change.getFields().isEmpty()) {
            return;
        }
        List<HrOrderChange> changes = new ArrayList<>();
        changes.add(change);
        write(tenantId, actorUserId, HrOrderType.DIRECT_EDIT, SOURCE_DIRECT, LocalDate.now(), null, changes);
    }

    @Override
    public Long recordOrder(Long tenantId, Long actorUserId, HrOrderType type, LocalDate orderDt, String remark,
            List<HrOrderChange> changes) throws Exception {
        return write(tenantId, actorUserId, type, SOURCE_ORDER, orderDt, remark, changes);
    }

    private Long write(Long tenantId, Long actorUserId, HrOrderType type, String source, LocalDate orderDt, String remark,
            List<HrOrderChange> changes) throws Exception {
        Map<String, Object> header = new HashMap<>();
        header.put("tenantId", tenantId);
        header.put("orderDt", Date.valueOf(orderDt));
        header.put("orderType", type.name());
        header.put("orderSource", source);
        header.put("remark", normalizeRemark(remark));
        header.put("createdBy", actorUserId);
        Long orderId = hrOrderDAO.insertOrderHd(header);
        if (orderId == null) {
            throw new IllegalStateException("인사명령 이력을 저장하지 못했습니다.");
        }
        for (HrOrderChange change : changes) {
            for (HrOrderChange.Field field : change.getFields()) {
                Map<String, Object> detail = new HashMap<>();
                detail.put("orderId", orderId);
                detail.put("tenantId", tenantId);
                detail.put("userId", change.getUserId());
                detail.put("fieldCode", field.getField().name());
                detail.put("preValue", field.getPreValue());
                detail.put("preName", field.getPreName());
                detail.put("postValue", field.getPostValue());
                detail.put("postName", field.getPostName());
                hrOrderDAO.insertOrderDt(detail);
            }
        }
        return orderId;
    }

    private String normalizeRemark(String remark) {
        if (!StringUtils.hasText(remark)) {
            return null;
        }
        String trimmed = remark.trim();
        if (trimmed.length() > MAX_REMARK_LENGTH) {
            throw new IllegalArgumentException("비고는 " + MAX_REMARK_LENGTH + "자 이하로 입력해 주세요.");
        }
        return trimmed;
    }
}
