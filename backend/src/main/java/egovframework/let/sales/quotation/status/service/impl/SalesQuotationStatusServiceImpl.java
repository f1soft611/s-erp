package egovframework.let.sales.quotation.status.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import egovframework.let.sales.quotation.status.domain.model.SalesQuotationStatusSearchVO;
import egovframework.let.sales.quotation.status.domain.model.SalesQuotationStatusVO;
import egovframework.let.sales.quotation.status.domain.repository.SalesQuotationStatusDAO;
import egovframework.let.sales.quotation.status.service.SalesQuotationStatusService;

@Service
public class SalesQuotationStatusServiceImpl implements SalesQuotationStatusService {
    private final SalesQuotationStatusDAO dao;
    public SalesQuotationStatusServiceImpl(SalesQuotationStatusDAO dao) { this.dao = dao; }

    @Override
    public List<SalesQuotationStatusVO> search(Long tenantId, SalesQuotationStatusSearchVO search) {
        if (tenantId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        if (search == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "견적일 범위가 필요합니다.");
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        range(params, "quotationDt", search.getQuotationDtFrom(), search.getQuotationDtTo(), true);
        range(params, "submitDt", search.getSubmitDtFrom(), search.getSubmitDtTo(), false);
        params.put("quotationNo", text(search.getQuotationNo()));
        params.put("customerKeyword", text(search.getCustomerKeyword()));
        params.put("materialKeyword", text(search.getMaterialKeyword()));
        return dao.selectList(params);
    }
    private void range(Map<String, Object> p, String key, String from, String to, boolean required) {
        LocalDate start = date(from), end = date(to);
        if ((required && (start == null || end == null)) || (start != null && end != null && start.isAfter(end)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜 범위가 올바르지 않습니다.");
        p.put(key + "From", start); p.put(key + "To", end);
    }
    private LocalDate date(String value) {
        if (!StringUtils.hasText(value)) return null;
        try { return LocalDate.parse(value.trim()); }
        catch (DateTimeParseException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜 형식이 올바르지 않습니다."); }
    }
    private String text(String value) { return StringUtils.hasText(value) ? value.trim() : null; }
}
