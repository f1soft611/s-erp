package egovframework.let.materials.request.create.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestDetailSaveRequestVO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestDetailVO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestRequesterVO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestSaveRequestVO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestVO;
import egovframework.let.materials.request.create.domain.repository.PurchaseRequestDAO;
import egovframework.let.materials.request.create.service.PurchaseRequestService;

/**
 * 구매요청 검증, 채번 및 저장을 처리하는 서비스 구현 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Service("purchaseRequestService")
public class PurchaseRequestServiceImpl extends EgovAbstractServiceImpl implements PurchaseRequestService {

    static final String STATUS_REQUESTED = "REQUESTED";
    private static final String REQUEST_NO_GENERATOR_KEY = "MATERIAL_REQUEST_NO";
    private static final int REQUEST_NO_MAX_LENGTH = 30;
    private static final int MAX_NUMERIC_PRECISION = 15;
    private static final int QTY_SCALE = 2;
    private static final int REMARK_MAX_LENGTH = 500;
    /** 구매요청 가능 품목계정(ITEM_TYPE): 원재료, 부재료, 소모품. */
    static final Set<String> PURCHASABLE_MATERIAL_TYPE_CODES =
            Collections.unmodifiableSet(new HashSet<String>(Arrays.asList("RAW", "SUB", "SUPPLY")));

    private final PurchaseRequestDAO purchaseRequestDAO;
    private final IdSequenceService idSequenceService;

    public PurchaseRequestServiceImpl(PurchaseRequestDAO purchaseRequestDAO,
            IdSequenceService idSequenceService) {
        this.purchaseRequestDAO = purchaseRequestDAO;
        this.idSequenceService = idSequenceService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseRequestVO createRequest(Long tenantId, String userId, PurchaseRequestSaveRequestVO payload)
            throws Exception {
        validatePrincipal(tenantId, userId);
        validateHeader(payload);
        List<PreparedDetail> details = prepareDetails(tenantId, payload);
        PurchaseRequestRequesterVO requester = findRequester(tenantId, userId);

        String requestNo = generateRequestNo(tenantId, payload.getRequestDt());
        Map<String, Object> header = new HashMap<String, Object>();
        header.put("tenantId", tenantId);
        header.put("requestNo", requestNo);
        header.put("requestDt", payload.getRequestDt());
        header.put("requesterId", requester.getUserId());
        header.put("requestDeptId", requester.getDepartmentId());
        header.put("status", STATUS_REQUESTED);
        header.put("remark", normalize(payload.getRemark()));
        header.put("createdBy", userId);
        Long purchaseRequestId = purchaseRequestDAO.insertRequestHeader(header);
        if (purchaseRequestId == null || purchaseRequestId < 1L) {
            throw new IllegalStateException("구매요청 헤더 저장에 실패했습니다.");
        }

        int lineNo = 1;
        for (PreparedDetail detail : details) {
            insertDetail(tenantId, purchaseRequestId, lineNo++, detail, userId);
        }
        return getRequest(tenantId, purchaseRequestId);
    }

    @Override
    public PurchaseRequestVO getRequest(Long tenantId, Long purchaseRequestId) throws Exception {
        if (tenantId == null || purchaseRequestId == null || purchaseRequestId < 1L) {
            throw notFound();
        }
        PurchaseRequestVO request = purchaseRequestDAO.selectRequest(requestParams(tenantId, purchaseRequestId));
        if (request == null) {
            throw notFound();
        }
        request.setDetails(purchaseRequestDAO.selectRequestDetails(requestParams(tenantId, purchaseRequestId)));
        return request;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseRequestVO updateRequest(Long tenantId, String userId, Long purchaseRequestId,
            PurchaseRequestSaveRequestVO payload) throws Exception {
        validatePrincipal(tenantId, userId);
        validateHeader(payload);
        requireEditable(tenantId, purchaseRequestId);
        List<PreparedDetail> details = prepareDetails(tenantId, payload);

        Map<Long, PurchaseRequestDetailVO> existingById = new HashMap<Long, PurchaseRequestDetailVO>();
        for (PurchaseRequestDetailVO existing
                : purchaseRequestDAO.selectRequestDetails(requestParams(tenantId, purchaseRequestId))) {
            existingById.put(existing.getPurchaseRequestDetailId(), existing);
        }

        Set<Long> keptIds = new HashSet<Long>();
        boolean reordered = false;
        for (int index = 0; index < details.size(); index++) {
            Long detailId = details.get(index).purchaseRequestDetailId;
            if (detailId == null) {
                continue;
            }
            PurchaseRequestDetailVO existing = existingById.get(detailId);
            if (existing == null || !keptIds.add(detailId)) {
                throw badRequest("구매요청 상세 정보가 올바르지 않습니다. 화면을 다시 조회해 주세요.");
            }
            if (existing.getLineNo() == null || existing.getLineNo() != index + 1) {
                reordered = true;
            }
        }

        Map<String, Object> header = requestParams(tenantId, purchaseRequestId);
        header.put("requestDt", payload.getRequestDt());
        header.put("remark", normalize(payload.getRemark()));
        header.put("updatedBy", userId);
        if (purchaseRequestDAO.updateRequestHeader(header) != 1) {
            throw notFound();
        }

        for (Long existingId : existingById.keySet()) {
            if (!keptIds.contains(existingId)) {
                if (purchaseRequestDAO.deleteRequestDetail(detailParams(tenantId, purchaseRequestId, existingId)) != 1) {
                    throw concurrentChange();
                }
            }
        }
        if (reordered) {
            purchaseRequestDAO.shiftDetailLineNos(requestParams(tenantId, purchaseRequestId));
        }

        for (int index = 0; index < details.size(); index++) {
            int lineNo = index + 1;
            PreparedDetail detail = details.get(index);
            if (detail.purchaseRequestDetailId == null) {
                insertDetail(tenantId, purchaseRequestId, lineNo, detail, userId);
                continue;
            }
            PurchaseRequestDetailVO existing = existingById.get(detail.purchaseRequestDetailId);
            if (!reordered && detail.sameAs(existing)) {
                continue;
            }
            Map<String, Object> params = detailParams(tenantId, purchaseRequestId, detail.purchaseRequestDetailId);
            putDetailValues(params, lineNo, detail);
            params.put("updatedBy", userId);
            if (purchaseRequestDAO.updateRequestDetail(params) != 1) {
                throw concurrentChange();
            }
        }
        return getRequest(tenantId, purchaseRequestId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteRequest(Long tenantId, String userId, Long purchaseRequestId) throws Exception {
        validatePrincipal(tenantId, userId);
        requireEditable(tenantId, purchaseRequestId);
        Map<String, Object> params = requestParams(tenantId, purchaseRequestId);
        params.put("updatedBy", userId);
        if (purchaseRequestDAO.softDeleteRequestHeader(params) != 1) {
            throw notFound();
        }
    }

    private void requireEditable(Long tenantId, Long purchaseRequestId) throws Exception {
        if (purchaseRequestId == null || purchaseRequestId < 1L) {
            throw notFound();
        }
        PurchaseRequestVO request =
                purchaseRequestDAO.selectRequestForUpdate(requestParams(tenantId, purchaseRequestId));
        if (request == null) {
            throw notFound();
        }
        if (!STATUS_REQUESTED.equals(request.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "확정된 구매요청은 수정하거나 삭제할 수 없습니다.");
        }
    }

    private PurchaseRequestRequesterVO findRequester(Long tenantId, String userId) throws Exception {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("loginCode", userId);
        PurchaseRequestRequesterVO requester = purchaseRequestDAO.selectRequester(params);
        if (requester == null || requester.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "요청자 사용자 정보를 찾을 수 없습니다.");
        }
        return requester;
    }

    private void insertDetail(Long tenantId, Long purchaseRequestId, int lineNo, PreparedDetail detail,
            String userId) throws Exception {
        Map<String, Object> params = requestParams(tenantId, purchaseRequestId);
        putDetailValues(params, lineNo, detail);
        params.put("createdBy", userId);
        Long detailId = purchaseRequestDAO.insertRequestDetail(params);
        if (detailId == null || detailId < 1L) {
            throw new IllegalStateException("구매요청 상세 저장에 실패했습니다.");
        }
    }

    private void putDetailValues(Map<String, Object> params, int lineNo, PreparedDetail detail) {
        params.put("lineNo", lineNo);
        params.put("materialId", detail.materialId);
        params.put("requestQty", detail.requestQty);
        params.put("requestDeliveryDt", detail.requestDeliveryDt);
        params.put("useType", detail.useType);
        params.put("requestRemark", detail.requestRemark);
    }

    private List<PreparedDetail> prepareDetails(Long tenantId, PurchaseRequestSaveRequestVO payload)
            throws Exception {
        List<PreparedDetail> prepared = new ArrayList<PreparedDetail>();
        for (PurchaseRequestDetailSaveRequestVO detail : payload.getDetails()) {
            prepared.add(prepareDetail(tenantId, detail));
        }
        return prepared;
    }

    private PreparedDetail prepareDetail(Long tenantId, PurchaseRequestDetailSaveRequestVO detail)
            throws Exception {
        if (detail == null || detail.getMaterialId() == null || detail.getMaterialId() < 1L) {
            throw badRequest("품목을 선택해 주세요.");
        }
        if (detail.getRequestQty() == null || detail.getRequestQty().signum() <= 0) {
            throw badRequest("요청수량은 0보다 커야 합니다.");
        }
        if (detail.getRequestDeliveryDt() == null) {
            throw badRequest("요청납기일을 입력해 주세요.");
        }
        String useType = normalize(detail.getUseType());
        if (useType == null) {
            throw badRequest("사용용도를 선택해 주세요.");
        }
        validateText(detail.getRequestRemark(), REMARK_MAX_LENGTH, "비고");
        BigDecimal requestQty = quantity(detail.getRequestQty());

        String materialTypeCode = purchaseRequestDAO.selectMaterialTypeCode(
                referenceParams(tenantId, "id", detail.getMaterialId()));
        if (materialTypeCode == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "품목을 찾을 수 없습니다.");
        }
        if (!PURCHASABLE_MATERIAL_TYPE_CODES.contains(materialTypeCode.trim())) {
            throw badRequest("구매요청할 수 없는 품목계정입니다. 원재료, 부재료, 소모품만 선택할 수 있습니다.");
        }
        if (!purchaseRequestDAO.existsUseType(referenceParams(tenantId, "code", useType))) {
            throw badRequest("사용할 수 없는 사용용도입니다.");
        }
        return new PreparedDetail(detail.getPurchaseRequestDetailId(), detail.getMaterialId(), requestQty,
                detail.getRequestDeliveryDt(), useType, normalize(detail.getRequestRemark()));
    }

    private String generateRequestNo(Long tenantId, LocalDate requestDt) throws Exception {
        String dateKey = requestDt.toString().replace("-", "");
        Long sequence = idSequenceService.nextValue(REQUEST_NO_GENERATOR_KEY, tenantId.toString(), dateKey);
        if (sequence == null || sequence < 1L) {
            throw new IllegalStateException("구매요청번호를 생성할 수 없습니다.");
        }
        String requestNo = String.format(Locale.ROOT, "MR-%s-%04d", dateKey, sequence);
        if (requestNo.length() > REQUEST_NO_MAX_LENGTH) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "구매요청번호를 생성할 수 없습니다.");
        }
        return requestNo;
    }

    private void validatePrincipal(Long tenantId, String userId) {
        if (tenantId == null || tenantId < 1L || !StringUtils.hasText(userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private void validateHeader(PurchaseRequestSaveRequestVO payload) {
        if (payload == null || payload.getRequestDt() == null
                || payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("요청일과 상세 품목을 입력해 주세요.");
        }
        validateText(payload.getRemark(), REMARK_MAX_LENGTH, "비고");
    }

    private BigDecimal quantity(BigDecimal value) {
        BigDecimal normalized;
        try {
            normalized = value.setScale(QTY_SCALE, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw badRequest("요청수량은 소수 둘째 자리까지 입력할 수 있습니다.");
        }
        if (normalized.precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest("요청수량이 허용 범위를 초과했습니다.");
        }
        return normalized;
    }

    private void validateText(String value, int maxLength, String label) {
        if (value != null && value.trim().length() > maxLength) {
            throw badRequest(label + "는 " + maxLength + "자 이내로 입력해 주세요.");
        }
    }

    private Map<String, Object> requestParams(Long tenantId, Long purchaseRequestId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("purchaseRequestId", purchaseRequestId);
        return params;
    }

    private Map<String, Object> detailParams(Long tenantId, Long purchaseRequestId, Long detailId) {
        Map<String, Object> params = requestParams(tenantId, purchaseRequestId);
        params.put("purchaseRequestDetailId", detailId);
        return params;
    }

    private Map<String, Object> referenceParams(Long tenantId, String key, Object value) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put(key, value);
        return params;
    }

    private static String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static boolean same(Object left, Object right) {
        return left == null ? right == null : left.equals(right);
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "구매요청을 찾을 수 없습니다.");
    }

    private ResponseStatusException concurrentChange() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "구매요청 상세가 동시에 변경되었습니다. 다시 조회해 주세요.");
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static final class PreparedDetail {
        private final Long purchaseRequestDetailId;
        private final Long materialId;
        private final BigDecimal requestQty;
        private final LocalDate requestDeliveryDt;
        private final String useType;
        private final String requestRemark;

        private PreparedDetail(Long purchaseRequestDetailId, Long materialId, BigDecimal requestQty,
                LocalDate requestDeliveryDt, String useType, String requestRemark) {
            this.purchaseRequestDetailId = purchaseRequestDetailId;
            this.materialId = materialId;
            this.requestQty = requestQty;
            this.requestDeliveryDt = requestDeliveryDt;
            this.useType = useType;
            this.requestRemark = requestRemark;
        }

        private boolean sameAs(PurchaseRequestDetailVO existing) {
            return same(materialId, existing.getMaterialId())
                    && existing.getRequestQty() != null && requestQty.compareTo(existing.getRequestQty()) == 0
                    && same(requestDeliveryDt, existing.getRequestDeliveryDt())
                    && same(useType, existing.getUseType())
                    && same(requestRemark, normalize(existing.getRequestRemark()));
        }
    }
}
