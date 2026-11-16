package egovframework.let.materials.request.status.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.materials.request.status.domain.model.PurchaseRequestStatusSearchVO;
import egovframework.let.materials.request.status.domain.model.PurchaseRequestStatusVO;
import egovframework.let.materials.request.status.domain.repository.PurchaseRequestStatusDAO;
import egovframework.let.materials.request.status.service.PurchaseRequestStatusService;

/**
 * 구매요청현황 검색 조건을 정규화하고 조회하는 서비스 구현 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Service("purchaseRequestStatusService")
public class PurchaseRequestStatusServiceImpl extends EgovAbstractServiceImpl
        implements PurchaseRequestStatusService {

    private final PurchaseRequestStatusDAO purchaseRequestStatusDAO;

    public PurchaseRequestStatusServiceImpl(PurchaseRequestStatusDAO purchaseRequestStatusDAO) {
        this.purchaseRequestStatusDAO = purchaseRequestStatusDAO;
    }

    @Override
    public List<PurchaseRequestStatusVO> selectRequestStatusList(Long tenantId, PurchaseRequestStatusSearchVO search)
            throws Exception {
        PurchaseRequestStatusSearchVO condition = search == null ? new PurchaseRequestStatusSearchVO() : search;
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("keyword", text(condition.getKeyword()));
        params.put("requestNo", text(condition.getRequestNo()));
        params.put("requesterKeyword", text(condition.getRequesterKeyword()));
        params.put("status", text(condition.getStatus()));
        params.put("materialKeyword", text(condition.getMaterialKeyword()));
        params.put("useType", text(condition.getUseType()));
        putDateRange(params, "requestDt", condition.getRequestDtFrom(), condition.getRequestDtTo());
        putDateRange(params, "requestDeliveryDt",
                condition.getRequestDeliveryDtFrom(), condition.getRequestDeliveryDtTo());
        return purchaseRequestStatusDAO.selectRequestStatusList(params);
    }

    private void putDateRange(Map<String, Object> params, String prefix, String from, String to) {
        LocalDate fromDate = date(from);
        LocalDate toDate = date(to);
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시작일이 종료일보다 늦습니다.");
        }
        params.put(prefix + "From", fromDate == null ? null : fromDate.toString());
        params.put(prefix + "To", toDate == null ? null : toDate.toString());
    }

    private LocalDate date(String value) {
        String text = text(value);
        if (text == null) {
            return null;
        }
        try {
            return LocalDate.parse(text);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜 형식이 올바르지 않습니다.");
        }
    }

    private String text(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
