package egovframework.let.sales.order.create.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.sales.order.create.domain.model.SalesOrderCreateRequestVO;
import egovframework.let.sales.order.create.domain.model.SalesOrderDetailCreateRequestVO;
import egovframework.let.sales.order.create.domain.model.SalesOrderDetailVO;
import egovframework.let.sales.order.create.domain.model.SalesOrderVO;
import egovframework.let.sales.order.create.domain.repository.SalesOrderDAO;
import egovframework.let.sales.order.create.service.SalesOrderService;
import egovframework.let.common.idsequence.service.IdSequenceService;

/**
 * 수주 등록 검증, 계산, 채번 및 저장을 처리하는 서비스 구현 클래스.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
@Service("salesOrderService")
public class SalesOrderServiceImpl extends EgovAbstractServiceImpl implements SalesOrderService {
    private static final String ORDER_NO_GENERATOR_KEY = "SALES_ORDER_NO";
    private static final String EDITABLE_STATUS = "수주등록";
    private static final BigDecimal VAT_RATE = new BigDecimal("0.10");
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final int MAX_NUMERIC_PRECISION = 15;
    private static final int MONEY_SCALE = 2;
    private static final int ORDER_NO_MAX_LENGTH = 30;

    private final SalesOrderDAO salesOrderDAO;
    private final IdSequenceService idSequenceService;

    public SalesOrderServiceImpl(SalesOrderDAO salesOrderDAO, IdSequenceService idSequenceService) {
        this.salesOrderDAO = salesOrderDAO;
        this.idSequenceService = idSequenceService;
    }

    /**
     * 테넌트 소유 거래처와 품목을 확인한 후 수주 헤더와 상세를 원자적으로 저장한다.
     *
     * @param tenantId 인증된 사용자의 테넌트 ID
     * @param userId 인증된 사용자의 ID
     * @param payload 수주 등록 요청
     * @return 저장된 수주 정보
     * @throws Exception 검증, 채번 또는 저장 중 발생한 예외
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public SalesOrderVO createOrder(Long tenantId, String userId, SalesOrderCreateRequestVO payload)
            throws Exception {
        validatePrincipal(tenantId, userId);
        validatePayload(payload);
        validateCustomer(tenantId, payload.getCustomerId());

        List<PreparedDetail> preparedDetails = prepareDetails(tenantId, payload);
        BigDecimal headerTotal = sumTotals(preparedDetails);

        String orderNo = generateOrderNo(tenantId, payload.getOrderDt());
        Map<String, Object> headerParams = new HashMap<>();
        headerParams.put("tenantId", tenantId);
        headerParams.put("orderNo", orderNo);
        headerParams.put("orderDt", payload.getOrderDt());
        headerParams.put("customerId", payload.getCustomerId());
        headerParams.put("quotNo", normalize(payload.getQuotNo()));
        headerParams.put("deliveryDt", payload.getDeliveryDt());
        headerParams.put("deliveryPlace", normalize(payload.getDeliveryPlace()));
        headerParams.put("deliveryMethod", normalize(payload.getDeliveryMethod()));
        headerParams.put("status", "수주등록");
        headerParams.put("totalAmt", headerTotal);
        headerParams.put("remark", normalize(payload.getRemark()));
        headerParams.put("createdBy", userId);

        Long salesOrderId = salesOrderDAO.insertOrderHeader(headerParams);
        if (salesOrderId == null || salesOrderId < 1L) {
            throw new IllegalStateException("수주 헤더 저장에 실패했습니다.");
        }

        List<SalesOrderDetailVO> savedDetails = new ArrayList<>();
        int lineNo = 1;
        for (PreparedDetail prepared : preparedDetails) {
            SalesOrderDetailVO savedDetail = persistDetail(
                    salesOrderId, tenantId, lineNo++, prepared);
            savedDetails.add(savedDetail);
        }

        SalesOrderVO saved = new SalesOrderVO();
        saved.setSalesOrderId(salesOrderId);
        saved.setTenantId(tenantId);
        saved.setOrderNo(orderNo);
        saved.setOrderDt(payload.getOrderDt());
        saved.setCustomerId(payload.getCustomerId());
        saved.setQuotNo(normalize(payload.getQuotNo()));
        saved.setDeliveryDt(payload.getDeliveryDt());
        saved.setDeliveryPlace(normalize(payload.getDeliveryPlace()));
        saved.setDeliveryMethod(normalize(payload.getDeliveryMethod()));
        saved.setStatus("수주등록");
        saved.setTotalAmt(headerTotal);
        saved.setRemark(normalize(payload.getRemark()));
        saved.setDetails(savedDetails);
        return saved;
    }

    /**
     * 테넌트 범위에서 사용 중인 수주 헤더와 상세를 조회한다.
     *
     * @param tenantId 인증된 사용자의 테넌트 ID
     * @param salesOrderId 수주 ID
     * @return 거래처/품목 코드와 명을 포함한 수주 정보
     * @throws Exception 조회 중 발생한 예외 (없으면 404)
     */
    @Override
    public SalesOrderVO getOrder(Long tenantId, Long salesOrderId) throws Exception {
        SalesOrderVO order = findOrder(tenantId, salesOrderId);
        order.setDetails(salesOrderDAO.selectOrderDetails(orderParams(tenantId, salesOrderId)));
        return order;
    }

    /**
     * 수정 가능한 수주의 헤더를 갱신하고 상세를 요청 순서대로 재등록한다.
     * 수주번호는 변경하지 않으며, 출하 전 수주등록 상태에서만 허용한다.
     *
     * @param tenantId 인증된 사용자의 테넌트 ID
     * @param userId 인증된 사용자의 ID
     * @param salesOrderId 수주 ID
     * @param payload 수주 수정 요청
     * @return 재조회한 수주 정보
     * @throws Exception 검증 또는 저장 중 발생한 예외
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public SalesOrderVO updateOrder(Long tenantId, String userId, Long salesOrderId,
            SalesOrderCreateRequestVO payload) throws Exception {
        validatePrincipal(tenantId, userId);
        validatePayload(payload);
        requireEditable(tenantId, salesOrderId);
        validateCustomer(tenantId, payload.getCustomerId());

        List<PreparedDetail> preparedDetails = prepareDetails(tenantId, payload);
        BigDecimal headerTotal = sumTotals(preparedDetails);

        Map<String, Object> headerParams = orderParams(tenantId, salesOrderId);
        headerParams.put("orderDt", payload.getOrderDt());
        headerParams.put("customerId", payload.getCustomerId());
        headerParams.put("quotNo", normalize(payload.getQuotNo()));
        headerParams.put("deliveryDt", payload.getDeliveryDt());
        headerParams.put("deliveryPlace", normalize(payload.getDeliveryPlace()));
        headerParams.put("deliveryMethod", normalize(payload.getDeliveryMethod()));
        headerParams.put("totalAmt", headerTotal);
        headerParams.put("remark", normalize(payload.getRemark()));
        headerParams.put("updatedBy", userId);
        if (salesOrderDAO.updateOrderHeader(headerParams) != 1) {
            throw orderNotFound();
        }

        salesOrderDAO.deleteOrderDetails(orderParams(tenantId, salesOrderId));
        int lineNo = 1;
        for (PreparedDetail prepared : preparedDetails) {
            persistDetail(salesOrderId, tenantId, lineNo++, prepared);
        }
        return getOrder(tenantId, salesOrderId);
    }

    /**
     * 수정 가능한 수주 헤더를 미사용(use_at = 'N') 처리한다.
     *
     * @param tenantId 인증된 사용자의 테넌트 ID
     * @param userId 인증된 사용자의 ID
     * @param salesOrderId 수주 ID
     * @throws Exception 삭제 중 발생한 예외
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteOrder(Long tenantId, String userId, Long salesOrderId) throws Exception {
        validatePrincipal(tenantId, userId);
        requireEditable(tenantId, salesOrderId);

        Map<String, Object> params = orderParams(tenantId, salesOrderId);
        params.put("updatedBy", userId);
        if (salesOrderDAO.softDeleteOrderHeader(params) != 1) {
            throw orderNotFound();
        }
    }

    private SalesOrderVO findOrder(Long tenantId, Long salesOrderId) throws Exception {
        if (tenantId == null || salesOrderId == null || salesOrderId < 1L) {
            throw orderNotFound();
        }
        SalesOrderVO order = salesOrderDAO.selectOrder(orderParams(tenantId, salesOrderId));
        if (order == null) {
            throw orderNotFound();
        }
        return order;
    }

    private void requireEditable(Long tenantId, Long salesOrderId) throws Exception {
        SalesOrderVO order = findOrder(tenantId, salesOrderId);
        if (!EDITABLE_STATUS.equals(order.getStatus())
                || salesOrderDAO.countShippedDetails(orderParams(tenantId, salesOrderId)) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "출하가 진행되었거나 수주등록 상태가 아닌 수주는 수정/삭제할 수 없습니다.");
        }
    }

    private void validatePayload(SalesOrderCreateRequestVO payload) {
        validateHeader(payload);
        validateText(payload.getQuotNo(), 30, "견적번호");
        validateText(payload.getDeliveryPlace(), 200, "납품장소");
        validateText(payload.getDeliveryMethod(), 50, "배송방법");
        validateText(payload.getRemark(), 500, "비고");
    }

    private void validateCustomer(Long tenantId, Long customerId) throws Exception {
        if (!salesOrderDAO.existsCustomer(referenceParams(tenantId, customerId))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "거래처를 찾을 수 없습니다.");
        }
    }

    private List<PreparedDetail> prepareDetails(Long tenantId, SalesOrderCreateRequestVO payload)
            throws Exception {
        List<PreparedDetail> preparedDetails = new ArrayList<>();
        for (SalesOrderDetailCreateRequestVO detail : payload.getDetails()) {
            preparedDetails.add(prepareDetail(tenantId, detail));
        }
        return preparedDetails;
    }

    private BigDecimal sumTotals(List<PreparedDetail> preparedDetails) {
        BigDecimal total = ZERO;
        for (PreparedDetail prepared : preparedDetails) {
            total = total.add(prepared.totalAmt);
        }
        total = money(total);
        validateNumeric(total, "수주 총액");
        return total;
    }

    private Map<String, Object> orderParams(Long tenantId, Long salesOrderId) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("salesOrderId", salesOrderId);
        return params;
    }

    private ResponseStatusException orderNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "수주를 찾을 수 없습니다.");
    }

    private void validatePrincipal(Long tenantId, String userId) {
        if (tenantId == null || tenantId < 1L || !StringUtils.hasText(userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private void validateHeader(SalesOrderCreateRequestVO payload) {
        if (payload == null || payload.getOrderDt() == null
                || payload.getCustomerId() == null || payload.getCustomerId() < 1L
                || payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("수주일자, 거래처 및 상세 품목을 입력해 주세요.");
        }
    }

    private PreparedDetail prepareDetail(Long tenantId, SalesOrderDetailCreateRequestVO detail)
            throws Exception {
        if (detail == null || detail.getMaterialId() == null || detail.getMaterialId() < 1L) {
            throw badRequest("상세 품목을 선택해 주세요.");
        }
        if (detail.getOrderQty() == null || detail.getOrderQty().signum() <= 0) {
            throw badRequest("주문수량은 0보다 커야 합니다.");
        }
        if (detail.getUnitPrice() == null || detail.getUnitPrice().signum() < 0) {
            throw badRequest("단가는 0 이상이어야 합니다.");
        }
        if (detail.getVatAmt() != null && detail.getVatAmt().signum() < 0) {
            throw badRequest("부가세는 0 이상이어야 합니다.");
        }
        if (!salesOrderDAO.existsMaterial(referenceParams(tenantId, detail.getMaterialId()))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "품목을 찾을 수 없습니다.");
        }

        BigDecimal quantity = inputNumeric(detail.getOrderQty(), "주문수량");
        BigDecimal unitPrice = inputNumeric(detail.getUnitPrice(), "단가");
        BigDecimal supplyAmt = money(quantity.multiply(unitPrice));
        validateNumeric(supplyAmt, "공급가액");

        BigDecimal vatAmt = detail.getVatAmt() == null
                ? money(supplyAmt.multiply(VAT_RATE))
                : inputNumeric(detail.getVatAmt(), "부가세");
        BigDecimal totalAmt = money(supplyAmt.add(vatAmt));
        validateNumeric(vatAmt, "부가세");
        validateNumeric(totalAmt, "라인 합계");

        return new PreparedDetail(
                detail.getMaterialId(),
                quantity,
                unitPrice,
                supplyAmt,
                vatAmt,
                totalAmt,
                detail.getDeliveryDt());
    }

    private SalesOrderDetailVO persistDetail(
            Long salesOrderId, Long tenantId, int lineNo, PreparedDetail detail) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("salesOrderId", salesOrderId);
        params.put("tenantId", tenantId);
        params.put("lineNo", lineNo);
        params.put("materialId", detail.materialId);
        params.put("orderQty", detail.orderQty);
        params.put("unitPrice", detail.unitPrice);
        params.put("supplyAmt", detail.supplyAmt);
        params.put("vatAmt", detail.vatAmt);
        params.put("totalAmt", detail.totalAmt);
        params.put("deliveryDt", detail.deliveryDt);
        params.put("shippedQty", ZERO);
        params.put("lineStatus", "대기");

        Long detailId = salesOrderDAO.insertOrderDetail(params);
        if (detailId == null || detailId < 1L) {
            throw new IllegalStateException("수주 상세 저장에 실패했습니다.");
        }

        SalesOrderDetailVO saved = new SalesOrderDetailVO();
        saved.setSalesOrderDetailId(detailId);
        saved.setSalesOrderId(salesOrderId);
        saved.setTenantId(tenantId);
        saved.setLineNo(lineNo);
        saved.setMaterialId(detail.materialId);
        saved.setOrderQty(detail.orderQty);
        saved.setUnitPrice(detail.unitPrice);
        saved.setSupplyAmt(detail.supplyAmt);
        saved.setVatAmt(detail.vatAmt);
        saved.setTotalAmt(detail.totalAmt);
        saved.setDeliveryDt(detail.deliveryDt);
        saved.setShippedQty(ZERO);
        saved.setLineStatus("대기");
        return saved;
    }

    private String generateOrderNo(Long tenantId, LocalDate orderDt) throws Exception {
        String dateKey = orderDt.toString().replace("-", "");
        Long sequence = idSequenceService.nextValue(
                ORDER_NO_GENERATOR_KEY, tenantId.toString(), dateKey);
        if (sequence == null || sequence < 1L) {
            throw new IllegalStateException("수주번호를 생성할 수 없습니다.");
        }

        String orderNo = String.format(Locale.ROOT, "SO-%s-%04d", dateKey, sequence);
        if (orderNo.length() > ORDER_NO_MAX_LENGTH) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "수주번호를 생성할 수 없습니다.");
        }
        return orderNo;
    }

    private Map<String, Object> referenceParams(Long tenantId, Long id) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("id", id);
        return params;
    }

    private BigDecimal inputNumeric(BigDecimal value, String label) {
        BigDecimal normalized;
        try {
            normalized = value.setScale(MONEY_SCALE, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw badRequest(label + "은 소수 둘째 자리까지 입력할 수 있습니다.");
        }
        validateNumeric(normalized, label);
        return normalized;
    }

    private void validateNumeric(BigDecimal value, String label) {
        if (value.precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest(label + "이 허용 범위를 초과했습니다.");
        }
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    private void validateText(String value, int maxLength, String label) {
        if (value != null && value.trim().length() > maxLength) {
            throw badRequest(label + "은 " + maxLength + "자 이내로 입력해 주세요.");
        }
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static final class PreparedDetail {
        private final Long materialId;
        private final BigDecimal orderQty;
        private final BigDecimal unitPrice;
        private final BigDecimal supplyAmt;
        private final BigDecimal vatAmt;
        private final BigDecimal totalAmt;
        private final LocalDate deliveryDt;

        private PreparedDetail(
                Long materialId,
                BigDecimal orderQty,
                BigDecimal unitPrice,
                BigDecimal supplyAmt,
                BigDecimal vatAmt,
                BigDecimal totalAmt,
                LocalDate deliveryDt) {
            this.materialId = materialId;
            this.orderQty = orderQty;
            this.unitPrice = unitPrice;
            this.supplyAmt = supplyAmt;
            this.vatAmt = vatAmt;
            this.totalAmt = totalAmt;
            this.deliveryDt = deliveryDt;
        }
    }
}
