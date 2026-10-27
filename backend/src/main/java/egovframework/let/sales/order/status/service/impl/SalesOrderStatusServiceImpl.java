package egovframework.let.sales.order.status.service.impl;

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

import egovframework.let.sales.order.status.domain.model.SalesOrderStatusSearchVO;
import egovframework.let.sales.order.status.domain.model.SalesOrderStatusVO;
import egovframework.let.sales.order.status.domain.repository.SalesOrderStatusDAO;
import egovframework.let.sales.order.status.service.SalesOrderStatusService;

/**
 * 수주현황 조회 서비스 구현 클래스.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
@Service("salesOrderStatusService")
public class SalesOrderStatusServiceImpl extends EgovAbstractServiceImpl implements SalesOrderStatusService {

    private final SalesOrderStatusDAO salesOrderStatusDAO;

    /**
     * 수주현황 DAO를 주입받아 서비스를 생성한다.
     *
     * @param salesOrderStatusDAO 수주현황 DAO
     */
    public SalesOrderStatusServiceImpl(SalesOrderStatusDAO salesOrderStatusDAO) {
        this.salesOrderStatusDAO = salesOrderStatusDAO;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public List<SalesOrderStatusVO> selectOrderStatusList(
            Long tenantId, SalesOrderStatusSearchVO search) throws Exception {
        SalesOrderStatusSearchVO condition = search == null ? new SalesOrderStatusSearchVO() : search;
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("keyword", text(condition.getKeyword()));
        params.put("orderNo", text(condition.getOrderNo()));
        params.put("customerKeyword", text(condition.getCustomerKeyword()));
        params.put("quotNo", text(condition.getQuotNo()));
        params.put("status", text(condition.getStatus()));
        params.put("materialKeyword", text(condition.getMaterialKeyword()));
        params.put("lineStatus", text(condition.getLineStatus()));
        putDateRange(params, "orderDt", condition.getOrderDtFrom(), condition.getOrderDtTo());
        putDateRange(params, "deliveryDt", condition.getDeliveryDtFrom(), condition.getDeliveryDtTo());
        return salesOrderStatusDAO.selectOrderStatusList(params);
    }

    /**
     * 날짜 범위를 검증한 뒤 From/To 파라미터로 등록한다.
     *
     * @param params 조회 파라미터
     * @param prefix 파라미터 접두어
     * @param from 시작일 문자열
     * @param to 종료일 문자열
     */
    private void putDateRange(Map<String, Object> params, String prefix, String from, String to) {
        LocalDate fromDate = date(from);
        LocalDate toDate = date(to);
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시작일이 종료일보다 늦습니다.");
        }
        params.put(prefix + "From", fromDate == null ? null : fromDate.toString());
        params.put(prefix + "To", toDate == null ? null : toDate.toString());
    }

    /**
     * yyyy-MM-dd 형식의 날짜 문자열을 해석한다. 빈 값은 null로 처리한다.
     *
     * @param value 날짜 문자열
     * @return 해석된 날짜 또는 null
     */
    private LocalDate date(String value) {
        String text = text(value);
        if (text == null) {
            return null;
        }
        try {
            return LocalDate.parse(text);
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜 형식이 올바르지 않습니다.");
        }
    }

    /**
     * 문자열의 앞뒤 공백을 제거하고 빈 값은 null로 처리한다.
     *
     * @param value 입력 문자열
     * @return 정규화된 문자열 또는 null
     */
    private String text(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
