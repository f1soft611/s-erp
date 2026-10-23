package egovframework.let.co.master.customer.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.postgresql.util.PSQLException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.co.master.customer.domain.model.CustomerInfoSaveRequestVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoSearchCondition;
import egovframework.let.co.master.customer.domain.model.CustomerInfoVO;
import egovframework.let.co.master.customer.domain.repository.CustomerInfoDAO;
import egovframework.let.co.master.customer.service.CustomerInfoService;

@Service("customerInfoService")
public class CustomerInfoServiceImpl extends EgovAbstractServiceImpl implements CustomerInfoService {

    private static final int MAX_GENERATED_CODE_ATTEMPTS = 10;
    private static final String GENERATED_CODE_PATTERN = "[0-9]{6}";

    private final CustomerInfoDAO customerInfoDAO;
    private final EgovIdGnrService customerCodeIdGnrService;

    public CustomerInfoServiceImpl(
            CustomerInfoDAO customerInfoDAO,
            @Qualifier("customerCodeIdGnrService") EgovIdGnrService customerCodeIdGnrService) {
        this.customerInfoDAO = customerInfoDAO;
        this.customerCodeIdGnrService = customerCodeIdGnrService;
    }

    @Override
    public List<CustomerInfoVO> listCustomers(Long tenantId) throws Exception {
        validateTenantId(tenantId);
        return customerInfoDAO.selectCustomerList(tenantId);
    }

    @Override
    public List<CustomerInfoVO> listCustomers(
            Long tenantId,
            CustomerInfoSearchCondition condition) throws Exception {
        validateTenantId(tenantId);
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        if (condition != null) {
            putSearchValue(params, "keyword", condition.getKeyword());
            putSearchValue(params, "presidentName", condition.getPresidentName());
            putSearchValue(params, "businessNo", condition.getBusinessNo());
            putSearchValue(params, "juridNo", condition.getJuridNo());
            putSearchValue(params, "businessStatus1", condition.getBusinessStatus1());
            putSearchValue(params, "businessItem1", condition.getBusinessItem1());
            putSearchValue(params, "useAt", normalizeSearchUseAt(condition.getUseAt()));
        }
        return customerInfoDAO.selectCustomerList(params);
    }

    private void putSearchValue(Map<String, Object> params, String key, String value) {
        if (StringUtils.hasText(value)) {
            params.put(key, value.trim());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CustomerInfoVO createCustomer(
            Long tenantId,
            Long currentUserId,
            CustomerInfoSaveRequestVO payload) throws Exception {
        validateTenantId(tenantId);
        validatePayload(payload);
        String customerName = requireCustomerName(payload.getCustomerName());
        String useAt = normalizeUseAt(payload.getUseAt(), true);
        ensureCustomerNameAvailable(tenantId, customerName, null);
        String customerCode = resolveCustomerCode(tenantId, payload.getCustomerCode(), null);

        Map<String, Object> params = buildSaveParams(
                tenantId, currentUserId, customerCode, customerName, useAt, payload);
        Long customerId;
        try {
            customerId = customerInfoDAO.insertCustomer(params);
        } catch (DuplicateKeyException ex) {
            throw duplicateSaveError(ex);
        }
        if (customerId == null) {
            throw new IllegalStateException("거래처 등록 결과를 확인할 수 없습니다.");
        }
        return findByIdOrThrow(tenantId, customerId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CustomerInfoVO updateCustomer(
            Long tenantId,
            Long currentUserId,
            Long customerId,
            CustomerInfoSaveRequestVO payload) throws Exception {
        validateTenantId(tenantId);
        if (customerId == null) {
            throw new IllegalArgumentException("거래처 ID가 필요합니다.");
        }
        validatePayload(payload);
        findByIdOrThrow(tenantId, customerId);
        String customerName = requireCustomerName(payload.getCustomerName());
        String useAt = normalizeUseAt(payload.getUseAt(), false);
        ensureCustomerNameAvailable(tenantId, customerName, customerId);
        String customerCode = resolveCustomerCode(
                tenantId, payload.getCustomerCode(), customerId);

        Map<String, Object> params = buildSaveParams(
                tenantId, currentUserId, customerCode, customerName, useAt, payload);
        params.put("customerId", customerId);
        int updatedRows;
        try {
            updatedRows = customerInfoDAO.updateCustomer(params);
        } catch (DuplicateKeyException ex) {
            throw duplicateSaveError(ex);
        }
        if (updatedRows == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "거래처를 찾을 수 없습니다.");
        }
        return findByIdOrThrow(tenantId, customerId);
    }

    private Map<String, Object> buildSaveParams(
            Long tenantId,
            Long currentUserId,
            String customerCode,
            String customerName,
            String useAt,
            CustomerInfoSaveRequestVO payload) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("customerCode", customerCode);
        params.put("customerName", customerName);
        params.put("custNameAbbr", normalizeText(payload.getCustNameAbbr()));
        params.put("presidentName", normalizeText(payload.getPresidentName()));
        params.put("businessNo", normalizeText(payload.getBusinessNo()));
        params.put("juridNo", normalizeText(payload.getJuridNo()));
        params.put("businessStatus1", normalizeText(payload.getBusinessStatus1()));
        params.put("businessItem1", normalizeText(payload.getBusinessItem1()));
        params.put("postCode", normalizeText(payload.getPostCode()));
        params.put("address", normalizeText(payload.getAddress()));
        params.put("telephoneNo", normalizeText(payload.getTelephoneNo()));
        params.put("facsimileNo", normalizeText(payload.getFacsimileNo()));
        params.put("custMemo", normalizeText(payload.getCustMemo()));
        params.put("useAt", useAt);
        params.put("createdBy", currentUserId);
        params.put("updatedBy", currentUserId);
        return params;
    }

    private String resolveCustomerCode(Long tenantId, String rawCode, Long excludeCustomerId) throws Exception {
        if (StringUtils.hasText(rawCode)) {
            String code = rawCode.trim();
            ensureCustomerCodeAvailable(tenantId, code, excludeCustomerId);
            return code;
        }
        if (excludeCustomerId != null) {
            throw new IllegalArgumentException("거래처 코드는 필수입니다.");
        }

        for (int attempt = 0; attempt < MAX_GENERATED_CODE_ATTEMPTS; attempt++) {
            String generatedCode = customerCodeIdGnrService.getNextStringId();
            validateGeneratedCode(generatedCode);
            if (findCustomerIdByCode(tenantId, generatedCode, null) == null) {
                return generatedCode;
            }
        }
        throw new IllegalArgumentException("거래처 코드를 생성할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    }

    private void validateGeneratedCode(String code) {
        if (code == null || !code.matches(GENERATED_CODE_PATTERN)) {
            throw new IllegalArgumentException("거래처 코드 채번이 6자리 범위를 초과했습니다.");
        }
        int value = Integer.parseInt(code);
        if (value < 1 || value > 999999) {
            throw new IllegalArgumentException("거래처 코드 채번이 6자리 범위를 초과했습니다.");
        }
    }

    private void ensureCustomerCodeAvailable(
            Long tenantId,
            String customerCode,
            Long excludeCustomerId) throws Exception {
        if (findCustomerIdByCode(tenantId, customerCode, excludeCustomerId) != null) {
            throw duplicateCodeError();
        }
    }

    private void ensureCustomerNameAvailable(
            Long tenantId,
            String customerName,
            Long excludeCustomerId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("customerName", customerName);
        params.put("excludeCustomerId", excludeCustomerId);
        if (customerInfoDAO.selectCustomerIdByName(params) != null) {
            throw new IllegalArgumentException("이미 사용 중인 거래처명입니다.");
        }
    }

    private Long findCustomerIdByCode(
            Long tenantId,
            String customerCode,
            Long excludeCustomerId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("customerCode", customerCode);
        params.put("excludeCustomerId", excludeCustomerId);
        return customerInfoDAO.selectCustomerIdByCode(params);
    }

    private CustomerInfoVO findByIdOrThrow(Long tenantId, Long customerId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("customerId", customerId);
        CustomerInfoVO customer = customerInfoDAO.selectCustomerById(params);
        if (customer == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "거래처를 찾을 수 없습니다.");
        }
        return customer;
    }

    private String requireCustomerName(String customerName) {
        if (!StringUtils.hasText(customerName)) {
            throw new IllegalArgumentException("거래처명은 필수입니다.");
        }
        return customerName.trim();
    }

    private String normalizeUseAt(String useAt, boolean allowDefault) {
        if (!StringUtils.hasText(useAt)) {
            if (allowDefault) {
                return "Y";
            }
            throw new IllegalArgumentException("사용 여부는 Y 또는 N이어야 합니다.");
        }
        String normalized = useAt.trim().toUpperCase(Locale.ROOT);
        if (!"Y".equals(normalized) && !"N".equals(normalized)) {
            throw new IllegalArgumentException("사용 여부는 Y 또는 N이어야 합니다.");
        }
        return normalized;
    }

    private String normalizeSearchUseAt(String useAt) {
        if (!StringUtils.hasText(useAt)) {
            return null;
        }
        return normalizeUseAt(useAt, false);
    }

    private String normalizeFilter(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String normalizeText(String value) {
        return normalizeFilter(value);
    }

    private void validatePayload(CustomerInfoSaveRequestVO payload) {
        if (payload == null) {
            throw new IllegalArgumentException("저장 요청이 비어 있습니다.");
        }
    }

    private void validateTenantId(Long tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("테넌트 정보가 없습니다.");
        }
    }

    private IllegalArgumentException duplicateCodeError() {
        return new IllegalArgumentException("이미 사용 중인 거래처 코드입니다.");
    }

    private IllegalArgumentException duplicateSaveError(DuplicateKeyException error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (!(cause instanceof PSQLException)) {
                continue;
            }
            PSQLException postgresError = (PSQLException) cause;
            if (postgresError.getServerErrorMessage() != null
                    && "uq_tb_customer_info_tenant_name".equals(
                            postgresError.getServerErrorMessage().getConstraint())) {
                return new IllegalArgumentException("이미 사용 중인 거래처명입니다.", error);
            }
        }
        return duplicateCodeError();
    }
}
