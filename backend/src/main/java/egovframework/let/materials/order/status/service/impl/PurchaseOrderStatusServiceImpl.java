package egovframework.let.materials.order.status.service.impl;

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

import egovframework.let.materials.order.status.domain.model.PurchaseOrderStatusSearchVO;
import egovframework.let.materials.order.status.domain.model.PurchaseOrderStatusVO;
import egovframework.let.materials.order.status.domain.repository.PurchaseOrderStatusDAO;
import egovframework.let.materials.order.status.service.PurchaseOrderStatusService;

/**
 * 발주현황 검색 조건을 정규화하고 조회하는 서비스 구현 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Service("purchaseOrderStatusService")
public class PurchaseOrderStatusServiceImpl extends EgovAbstractServiceImpl implements PurchaseOrderStatusService {

    private final PurchaseOrderStatusDAO purchaseOrderStatusDAO;

    public PurchaseOrderStatusServiceImpl(PurchaseOrderStatusDAO purchaseOrderStatusDAO) {
        this.purchaseOrderStatusDAO = purchaseOrderStatusDAO;
    }

    @Override
    public List<PurchaseOrderStatusVO> selectOrderStatusList(Long tenantId, PurchaseOrderStatusSearchVO search)
            throws Exception {
        if (tenantId == null || tenantId < 1L) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        PurchaseOrderStatusSearchVO condition = search == null ? new PurchaseOrderStatusSearchVO() : search;
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("keyword", text(condition.getKeyword()));
        params.put("orderNo", text(condition.getOrderNo()));
        params.put("supplierKeyword", text(condition.getSupplierKeyword()));
        params.put("materialKeyword", text(condition.getMaterialKeyword()));
        params.put("status", status(condition.getStatus()));
        params.put("sourceType", enumValue(condition.getSourceType(), "CONFIRM", "DIRECT"));
        putDateRange(params, "orderDt", condition.getOrderDtFrom(), condition.getOrderDtTo());
        putDateRange(params, "deliveryDt", condition.getDeliveryDtFrom(), condition.getDeliveryDtTo());
        return purchaseOrderStatusDAO.selectOrderStatusList(params);
    }

    /** 상태 조건이 없으면 정상만 조회한다(취소건은 취소·전체를 고를 때만 나온다). */
    private String status(String value) {
        String text = text(value);
        if (text == null) {
            return "ACTIVE";
        }
        if (!"ACTIVE".equals(text) && !"CANCELED".equals(text) && !"ALL".equals(text)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "검색 조건이 올바르지 않습니다.");
        }
        return text;
    }

    private String enumValue(String value, String first, String second) {
        String text = text(value);
        if (text == null) {
            return null;
        }
        if (!first.equals(text) && !second.equals(text)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "검색 조건이 올바르지 않습니다.");
        }
        return text;
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
