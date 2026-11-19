package egovframework.let.materials.arrival.status.service.impl;

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

import egovframework.let.materials.arrival.status.domain.model.PurchaseArrivalStatusSearchVO;
import egovframework.let.materials.arrival.status.domain.model.PurchaseArrivalStatusVO;
import egovframework.let.materials.arrival.status.domain.repository.PurchaseArrivalStatusDAO;
import egovframework.let.materials.arrival.status.service.PurchaseArrivalStatusService;

/**
 * 가입고현황 검색 조건을 정규화하고 조회하는 서비스 구현 클래스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
@Service("purchaseArrivalStatusService")
public class PurchaseArrivalStatusServiceImpl extends EgovAbstractServiceImpl
        implements PurchaseArrivalStatusService {

    private final PurchaseArrivalStatusDAO purchaseArrivalStatusDAO;

    public PurchaseArrivalStatusServiceImpl(PurchaseArrivalStatusDAO purchaseArrivalStatusDAO) {
        this.purchaseArrivalStatusDAO = purchaseArrivalStatusDAO;
    }

    @Override
    public List<PurchaseArrivalStatusVO> selectArrivalStatusList(Long tenantId, PurchaseArrivalStatusSearchVO search)
            throws Exception {
        if (tenantId == null || tenantId < 1L) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        PurchaseArrivalStatusSearchVO condition = search == null ? new PurchaseArrivalStatusSearchVO() : search;
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("keyword", text(condition.getKeyword()));
        params.put("arrivalNo", text(condition.getArrivalNo()));
        params.put("supplierKeyword", text(condition.getSupplierKeyword()));
        params.put("materialKeyword", text(condition.getMaterialKeyword()));
        params.put("orderNo", text(condition.getOrderNo()));
        params.put("status", status(condition.getStatus()));
        LocalDate from = date(condition.getArrivalDtFrom());
        LocalDate to = date(condition.getArrivalDtTo());
        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시작일이 종료일보다 늦습니다.");
        }
        params.put("arrivalDtFrom", from == null ? null : from.toString());
        params.put("arrivalDtTo", to == null ? null : to.toString());
        return purchaseArrivalStatusDAO.selectArrivalStatusList(params);
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
