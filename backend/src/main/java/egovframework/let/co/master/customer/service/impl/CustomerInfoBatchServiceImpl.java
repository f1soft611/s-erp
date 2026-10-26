package egovframework.let.co.master.customer.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Stream;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import egovframework.let.co.master.customer.domain.model.CustomerInfoBatchChangeSetVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoBatchSaveRequestVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoBatchSaveResultVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoChangeVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoVO;
import egovframework.let.co.master.customer.service.CustomerInfoBatchService;
import egovframework.let.co.master.customer.service.CustomerInfoService;

@Service("customerInfoBatchService")
public class CustomerInfoBatchServiceImpl extends EgovAbstractServiceImpl implements CustomerInfoBatchService {

    private final CustomerInfoService customerInfoService;

    public CustomerInfoBatchServiceImpl(CustomerInfoService customerInfoService) {
        this.customerInfoService = customerInfoService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CustomerInfoBatchSaveResultVO saveBatch(
            Long tenantId, Long currentUserId, CustomerInfoBatchSaveRequestVO payload) throws Exception {
        if (payload == null) {
            throw new IllegalArgumentException("저장 요청이 비어 있습니다.");
        }
        CustomerInfoBatchChangeSetVO changes = payload.getCustomers() == null
                ? new CustomerInfoBatchChangeSetVO() : payload.getCustomers();
        if (!changes.getDeletedRows().isEmpty()) {
            throw new IllegalArgumentException("거래처는 삭제할 수 없습니다. 사용 여부를 변경해 주세요.");
        }
        for (CustomerInfoChangeVO row : changes.getInsertedRows()) {
            validateCustomerRow(row, true);
        }
        for (CustomerInfoChangeVO row : changes.getUpdatedRows()) {
            validateCustomerRow(row, false);
            requireCustomerId(row.getCustomerId());
        }

        Set<String> requestIds = new HashSet<>();
        Stream.concat(changes.getInsertedRows().stream(), changes.getUpdatedRows().stream()).forEach(row -> {
            if (StringUtils.hasText(row.getCustomerId()) && !requestIds.add(row.getCustomerId())) {
                throw new IllegalArgumentException("거래처 요청 행 ID가 중복되었습니다.");
            }
        });
        CustomerInfoBatchSaveResultVO result = new CustomerInfoBatchSaveResultVO();
        List<CustomerInfoVO> savedCustomers = new ArrayList<>();
        for (CustomerInfoChangeVO row : changes.getInsertedRows()) {
            CustomerInfoVO saved = customerInfoService.createCustomer(tenantId, currentUserId, row);
            savedCustomers.add(saved);
            if (StringUtils.hasText(row.getCustomerId())) result.getRowIdMappings().put(row.getCustomerId(), saved.getCustomerId());
        }
        for (CustomerInfoChangeVO row : changes.getUpdatedRows()) {
            CustomerInfoVO saved = customerInfoService.updateCustomer(
                    tenantId, currentUserId, requireCustomerId(row.getCustomerId()), row);
            savedCustomers.add(saved);
            result.getRowIdMappings().put(row.getCustomerId(), saved.getCustomerId());
        }

        result.setCustomers(savedCustomers);
        return result;
    }

    private void validateCustomerRow(CustomerInfoChangeVO row, boolean allowEmptyCode) {
        if (row == null) {
            throw new IllegalArgumentException("거래처 변경 행이 비어 있습니다.");
        }
        if (!StringUtils.hasText(row.getCustomerName())) {
            throw new IllegalArgumentException("거래처명은 필수입니다.");
        }
        if (!allowEmptyCode && !StringUtils.hasText(row.getCustomerCode())) {
            throw new IllegalArgumentException("거래처 코드는 필수입니다.");
        }
    }

    private Long requireCustomerId(String value) {
        if (value != null && value.trim().matches("[0-9]+")) {
            try {
                Long id = Long.valueOf(value.trim());
                if (id > 0) {
                    return id;
                }
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException("거래처 수정 시 올바른 ID가 필요합니다.", ex);
            }
        }
        throw new IllegalArgumentException("거래처 수정 시 올바른 ID가 필요합니다.");
    }
}
