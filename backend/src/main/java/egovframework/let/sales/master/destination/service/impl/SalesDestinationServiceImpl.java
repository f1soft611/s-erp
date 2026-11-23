package egovframework.let.sales.master.destination.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.HashSet;
import java.util.Set;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.sales.master.destination.domain.model.SalesDestinationVO;
import egovframework.let.sales.master.destination.domain.model.SalesDestinationCustomerVO;
import egovframework.let.sales.master.destination.domain.repository.SalesDestinationDAO;
import egovframework.let.sales.master.destination.service.SalesDestinationService;

@Service("salesDestinationService")
public class SalesDestinationServiceImpl extends EgovAbstractServiceImpl implements SalesDestinationService {
    private final SalesDestinationDAO dao;
    private final IdSequenceService sequences;

    public SalesDestinationServiceImpl(SalesDestinationDAO dao, IdSequenceService sequences) {
        this.dao = dao;
        this.sequences = sequences;
    }

    @Override
    public List<SalesDestinationCustomerVO> customers(Long tenantId, String keyword) throws Exception {
        requirePositive(tenantId, "테넌트");
        Map<String, Object> values = params(tenantId, null, null);
        values.put("keyword", StringUtils.hasText(keyword) ? keyword.trim() : null);
        return dao.customers(values);
    }

    @Override
    public List<SalesDestinationVO> list(Long tenantId, Long customerId) throws Exception {
        requirePositive(tenantId, "테넌트");
        requirePositive(customerId, "거래처");
        return dao.list(params(tenantId, customerId, null));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SalesDestinationVO create(Long tenantId, String userId, SalesDestinationVO input) throws Exception {
        Map<String, Object> params = validateInput(tenantId, userId, input);
        Long value = sequences.nextValue("SALES_DESTINATION_CODE", tenantId.toString(), "");
        params.put("destinationCode", String.format(Locale.ROOT, "%06d", value));
        Long id = dao.insert(params);
        if (id == null) {
            throw new IllegalStateException("납품처 저장 결과를 확인할 수 없습니다.");
        }
        return find(tenantId, id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SalesDestinationVO update(Long tenantId, String userId, Long id, SalesDestinationVO input) throws Exception {
        requirePositive(id, "납품처");
        Map<String, Object> values = validateInput(tenantId, userId, input);
        values.put("id", id);
        if (dao.updateDestination(values) != 1) {
            throw notFound();
        }
        return find(tenantId, id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveBatch(Long tenantId, String userId, Long customerId,
            List<SalesDestinationVO> inserted, List<SalesDestinationVO> updated) throws Exception {
        requirePositive(customerId, "거래처");
        if (inserted == null || updated == null || (inserted.isEmpty() && updated.isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "저장할 납품처가 없습니다.");
        }
        Set<Long> ids = new HashSet<Long>();
        for (SalesDestinationVO row : inserted) {
            if (row == null || !customerId.equals(row.getCustomerId()) || row.getSalesDestinationId() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "선택한 거래처의 신규 납품처를 확인해 주세요.");
            }
        }
        for (SalesDestinationVO row : updated) {
            if (row == null || !customerId.equals(row.getCustomerId())
                    || row.getSalesDestinationId() == null || !ids.add(row.getSalesDestinationId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수정할 납품처를 확인해 주세요.");
            }
        }
        for (SalesDestinationVO row : inserted) create(tenantId, userId, row);
        for (SalesDestinationVO row : updated) update(tenantId, userId, row.getSalesDestinationId(), row);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long tenantId, Long id) throws Exception {
        requirePositive(tenantId, "테넌트");
        requirePositive(id, "납품처");
        Map<String, Object> values = params(tenantId, null, id);
        if (dao.countOrders(values) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "수주에 사용된 납품처는 삭제할 수 없습니다.");
        }
        try {
            if (dao.deleteDestination(values) != 1) {
                throw notFound();
            }
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "수주에 사용된 납품처는 삭제할 수 없습니다.", ex);
        }
    }

    private Map<String, Object> validateInput(Long tenantId, String userId, SalesDestinationVO input) throws Exception {
        requirePositive(tenantId, "테넌트");
        if (!StringUtils.hasText(userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 사용자 정보를 확인할 수 없습니다.");
        }
        if (input == null || !StringUtils.hasText(input.getDestinationName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "납품처명을 입력해 주세요.");
        }
        requirePositive(input.getCustomerId(), "거래처");
        Map<String, Object> values = params(tenantId, input.getCustomerId(), null);
        if (!dao.customerExists(values)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "거래처를 찾을 수 없습니다.");
        }
        values.put("userId", userId);
        values.put("destinationName", text(input.getDestinationName(), 200));
        values.put("businessNo", text(input.getBusinessNo(), 40));
        values.put("address", text(input.getAddress(), 500));
        values.put("contactName", text(input.getContactName(), 100));
        values.put("mobileNo", text(input.getMobileNo(), 40));
        values.put("telephoneNo", text(input.getTelephoneNo(), 40));
        values.put("facsimileNo", text(input.getFacsimileNo(), 40));
        values.put("remark", text(input.getRemark(), 1000));
        return values;
    }

    private String text(String value, int maxLength) {
        if (!StringUtils.hasText(value)) return null;
        String trimmed = value.trim();
        if (trimmed.length() > maxLength) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "입력값이 허용 길이를 초과했습니다.");
        }
        return trimmed;
    }

    private SalesDestinationVO find(Long tenantId, Long id) throws Exception {
        SalesDestinationVO result = dao.find(params(tenantId, null, id));
        if (result == null) throw notFound();
        return result;
    }

    private Map<String, Object> params(Long tenantId, Long customerId, Long id) {
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("tenantId", tenantId);
        values.put("customerId", customerId);
        values.put("id", id);
        return values;
    }

    private void requirePositive(Long value, String label) {
        if (value == null || value < 1L) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " ID가 필요합니다.");
        }
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "납품처를 찾을 수 없습니다.");
    }
}
