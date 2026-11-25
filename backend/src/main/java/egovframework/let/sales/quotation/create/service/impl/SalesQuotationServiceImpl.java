package egovframework.let.sales.quotation.create.service.impl;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.sales.quotation.create.domain.model.*;
import egovframework.let.sales.quotation.create.domain.repository.SalesQuotationDAO;
import egovframework.let.sales.quotation.create.service.SalesQuotationService;
import egovframework.let.system.policies.service.SystemPolicyService;
import egovframework.let.sales.common.SalesDecimalPolicy;
import egovframework.com.cmm.DecimalColumnContract;

@Service
public class SalesQuotationServiceImpl implements SalesQuotationService {
    private final SalesQuotationDAO dao;
    private final IdSequenceService sequence;
    private final SystemPolicyService policy;

    public SalesQuotationServiceImpl(SalesQuotationDAO dao, IdSequenceService sequence, SystemPolicyService policy) {
        this.dao = dao;
        this.sequence = sequence;
        this.policy = policy;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SalesQuotationVO createQuotation(Long tenantId, String userId, SalesQuotationCreateRequestVO request) throws Exception {
        principal(tenantId, userId);
        Prepared prepared = prepare(tenantId, request);
        String date = request.getQuotationDt().format(DateTimeFormatter.BASIC_ISO_DATE);
        Long next = sequence.nextValue("SALES_QUOTATION_NO", tenantId.toString(), date);
        if (next == null || next < 1 || next > 9999) throw new IllegalStateException("견적번호를 생성할 수 없습니다.");
        String number = "QT-" + date + "-" + String.format(java.util.Locale.ROOT, "%04d", next);
        if (number.length() > 30) throw new IllegalStateException("견적번호 범위를 초과했습니다.");
        Map<String, Object> header = header(tenantId, userId, request, prepared);
        header.put("quotationNo", number);
        Long id = dao.insertHeader(header);
        persistDetails(tenantId, id, prepared.lines);
        SalesQuotationVO result = new SalesQuotationVO();
        result.setQuotationId(id); result.setTenantId(tenantId); result.setQuotationNo(number);
        result.setQuotationDt(request.getQuotationDt()); result.setSubmitDt(request.getSubmitDt());
        result.setCustomerId(request.getCustomerId()); result.setCustomerReference(text(request.getCustomerReference()));
        result.setIncoterms(text(request.getIncoterms())); result.setPaymentTerm(text(request.getPaymentTerm()));
        result.setValidTerm(text(request.getValidTerm())); result.setCurrencyCode(text(request.getCurrencyCode()));
        result.setRemark(text(request.getRemark())); result.setSupplyAmt(prepared.supply);
        result.setVatAmt(prepared.vat); result.setTotalAmt(prepared.total);
        result.setCreatedBy(userId); result.setWriter(true); result.setDetails(prepared.lines);
        return result;
    }

    @Override
    public SalesQuotationVO getQuotation(Long tenantId, String userId, Long quotationId) throws Exception {
        principal(tenantId, userId);
        Map<String, Object> params = key(tenantId, quotationId);
        SalesQuotationVO result = dao.selectHeader(params);
        if (result == null) throw error(HttpStatus.NOT_FOUND, "견적을 찾을 수 없습니다.");
        result.setWriter(userId.equals(result.getCreatedBy()));
        result.setDetails(dao.selectDetails(params));
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SalesQuotationVO updateQuotation(Long tenantId, String userId, Long quotationId, SalesQuotationCreateRequestVO request) throws Exception {
        principal(tenantId, userId);
        lockWriter(tenantId, userId, quotationId);
        Prepared prepared = prepare(tenantId, request);
        Map<String, Object> params = header(tenantId, userId, request, prepared);
        params.put("quotationId", quotationId);
        if (dao.updateHeader(params) != 1) throw error(HttpStatus.CONFLICT, "견적을 수정할 수 없습니다.");
        dao.deleteDetails(key(tenantId, quotationId));
        persistDetails(tenantId, quotationId, prepared.lines);
        return getQuotation(tenantId, userId, quotationId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteQuotation(Long tenantId, String userId, Long quotationId) throws Exception {
        principal(tenantId, userId);
        lockWriter(tenantId, userId, quotationId);
        Map<String, Object> params = key(tenantId, quotationId);
        params.put("updatedBy", userId);
        if (dao.softDelete(params) != 1) throw error(HttpStatus.CONFLICT, "견적을 삭제할 수 없습니다.");
    }

    @Override
    public List<SalesQuotationVO> options(Long tenantId, String userId, Long customerId, String keyword) {
        principal(tenantId, userId);
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId); params.put("customerId", customerId); params.put("keyword", text(keyword));
        return dao.selectOptions(params);
    }

    private void lockWriter(Long tenantId, String userId, Long quotationId) {
        SalesQuotationVO stored = dao.selectForUpdate(key(tenantId, quotationId));
        if (stored == null) throw error(HttpStatus.NOT_FOUND, "견적을 찾을 수 없습니다.");
        if (!userId.equals(stored.getCreatedBy())) throw error(HttpStatus.FORBIDDEN, "작성자만 변경할 수 있습니다.");
    }

    private Prepared prepare(Long tenantId, SalesQuotationCreateRequestVO request) throws Exception {
        if (request == null || request.getQuotationDt() == null || request.getCustomerId() == null
                || request.getDetails() == null || request.getDetails().isEmpty())
            throw error(HttpStatus.BAD_REQUEST, "견적일, 거래처와 품목이 필요합니다.");
        validateText(request.getCustomerReference(), 100); validateText(request.getIncoterms(), 50);
        validateText(request.getPaymentTerm(), 100); validateText(request.getValidTerm(), 100);
        validateText(request.getCurrencyCode(), 10); validateText(request.getRemark(), 500);
        SalesDecimalPolicy decimalPolicy = SalesDecimalPolicy.from(policy.getGridDecimals(tenantId),
                DecimalColumnContract.forDocument("sales.quotation"));
        decimalPolicy.verifySnapshot(request.getDecimalPolicy());
        decimalPolicy.verifyColumnContract(request.getDecimalColumns());
        Prepared p = new Prepared();
        for (SalesQuotationDetailCreateRequestVO input : request.getDetails()) {
            if (input == null || !StringUtils.hasText(input.getMaterialName()))
                throw error(HttpStatus.BAD_REQUEST, "품목명이 필요합니다.");
            validateText(input.getMaterialCode(), 20); validateText(input.getMaterialName(), 200);
            validateText(input.getMaterialSpec(), 100); validateText(input.getUnit(), 6); validateText(input.getRemark(), 500);
            if (input.getQuotationQty() == null || input.getUnitPrice() == null)
                throw error(HttpStatus.BAD_REQUEST, "수량과 단가가 필요합니다.");
            BigDecimal qty = decimalPolicy.input("quotationQty", input.getQuotationQty(), "수량");
            BigDecimal price = decimalPolicy.input("unitPrice", input.getUnitPrice(), "단가");
            if (qty.signum() <= 0 || price.signum() < 0)
                throw error(HttpStatus.BAD_REQUEST, "수량 또는 단가가 올바르지 않습니다.");
            SalesQuotationDetailVO line = new SalesQuotationDetailVO();
            line.setLineNo(p.lines.size() + 1); line.setMaterialId(input.getMaterialId());
            line.setMaterialCode(text(input.getMaterialCode())); line.setMaterialName(text(input.getMaterialName()));
            line.setMaterialSpec(text(input.getMaterialSpec())); line.setUnit(text(input.getUnit()));
            line.setQuotationQty(qty); line.setUnitPrice(price);
            line.setLineAmt(decimalPolicy.amount("lineAmt", qty.multiply(price), "견적금액")); line.setRemark(text(input.getRemark()));
            p.supply = p.supply.add(line.getLineAmt()); p.lines.add(line);
        }
        p.supply = decimalPolicy.amount("supplyAmt", p.supply, "공급가");
        p.vat = decimalPolicy.amount("vatAmt", p.supply.multiply(new BigDecimal("0.10")), "부가세");
        p.total = decimalPolicy.amount("totalAmt", p.supply.add(p.vat), "총액");
        if (!dao.existsCustomer(masterKey(tenantId, request.getCustomerId())))
            throw error(HttpStatus.NOT_FOUND, "거래처를 찾을 수 없습니다.");
        for (SalesQuotationDetailVO line : p.lines)
            if (line.getMaterialId() != null && !dao.existsMaterial(masterKey(tenantId, line.getMaterialId())))
                throw error(HttpStatus.NOT_FOUND, "품목을 찾을 수 없습니다.");
        return p;
    }

    private void persistDetails(Long tenantId, Long id, List<SalesQuotationDetailVO> lines) {
        for (SalesQuotationDetailVO line : lines) {
            Map<String, Object> p = key(tenantId, id);
            p.put("lineNo", line.getLineNo()); p.put("materialId", line.getMaterialId());
            p.put("materialCode", line.getMaterialCode()); p.put("materialName", line.getMaterialName());
            p.put("materialSpec", line.getMaterialSpec()); p.put("unit", line.getUnit());
            p.put("quotationQty", line.getQuotationQty()); p.put("unitPrice", line.getUnitPrice());
            p.put("lineAmt", line.getLineAmt()); p.put("remark", line.getRemark());
            line.setQuotationId(id); line.setTenantId(tenantId); line.setQuotationDetailId(dao.insertDetail(p));
        }
    }

    private Map<String, Object> header(Long tenantId, String userId, SalesQuotationCreateRequestVO r, Prepared p) {
        Map<String, Object> m = new HashMap<>();
        m.put("tenantId", tenantId); m.put("createdBy", userId); m.put("updatedBy", userId);
        m.put("quotationDt", r.getQuotationDt()); m.put("submitDt", r.getSubmitDt()); m.put("customerId", r.getCustomerId());
        m.put("customerReference", text(r.getCustomerReference())); m.put("incoterms", text(r.getIncoterms()));
        m.put("paymentTerm", text(r.getPaymentTerm())); m.put("validTerm", text(r.getValidTerm()));
        m.put("currencyCode", text(r.getCurrencyCode())); m.put("remark", text(r.getRemark()));
        m.put("supplyAmt", p.supply); m.put("vatAmt", p.vat); m.put("totalAmt", p.total);
        return m;
    }

    private Map<String, Object> key(Long tenantId, Long id) {
        Map<String, Object> m = new HashMap<>(); m.put("tenantId", tenantId); m.put("quotationId", id); return m;
    }
    private Map<String, Object> masterKey(Long tenantId, Long id) {
        Map<String, Object> m = new HashMap<>(); m.put("tenantId", tenantId); m.put("id", id); return m;
    }
    private void validateText(String value, int max) {
        if (value != null && value.length() > max) throw error(HttpStatus.BAD_REQUEST, "입력 길이를 초과했습니다.");
    }
    private String text(String value) { return StringUtils.hasText(value) ? value.trim() : null; }
    private void principal(Long tenant, String user) {
        if (tenant == null || !StringUtils.hasText(user)) throw error(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
    }
    private ResponseStatusException error(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
    private static class Prepared {
        private final List<SalesQuotationDetailVO> lines = new ArrayList<>();
        private BigDecimal supply = new BigDecimal("0.00");
        private BigDecimal vat;
        private BigDecimal total;
    }
}
