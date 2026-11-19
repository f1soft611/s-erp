package egovframework.let.quality.inspect.create.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeSet;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestRequesterVO;
import egovframework.let.materials.request.create.domain.repository.PurchaseRequestDAO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionArrivalRowVO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionCandidateVO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionDetailSaveRequestVO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionDetailVO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionSaveRequestVO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionVO;
import egovframework.let.quality.inspect.create.domain.repository.QualityInspectionDAO;
import egovframework.let.quality.inspect.create.service.QualityInspectionService;

/**
 * 자재 수입검사 검증, 채번, 검사 대기량 확인과 저장·수정·취소를 처리하는 서비스 구현 클래스.
 * 검사 대기량 = 가입고량 − 유효 검사의 (합격량+불합격량) 합이며, 가입고 행을 잠근 뒤 다시 계산한다.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Service("qualityInspectionService")
public class QualityInspectionServiceImpl extends EgovAbstractServiceImpl implements QualityInspectionService {

    static final String INSPECTION_NO_GENERATOR_KEY = "MATERIAL_INSPECTION_NO";
    private static final int NO_MAX_LENGTH = 30;
    private static final int MAX_DETAILS = 200;
    private static final int MAX_NUMERIC_PRECISION = 15;
    private static final int SCALE = 2;
    private static final int REMARK_MAX_LENGTH = 500;

    private final QualityInspectionDAO inspectionDAO;
    private final PurchaseRequestDAO requestDAO;
    private final IdSequenceService idSequenceService;

    public QualityInspectionServiceImpl(QualityInspectionDAO inspectionDAO, PurchaseRequestDAO requestDAO,
            IdSequenceService idSequenceService) {
        this.inspectionDAO = inspectionDAO;
        this.requestDAO = requestDAO;
        this.idSequenceService = idSequenceService;
    }

    @Override
    public List<QualityInspectionCandidateVO> listCandidates(Long tenantId, LocalDate fromDt, LocalDate toDt,
            String supplierKeyword, String materialKeyword, String keyword) throws Exception {
        requireTenant(tenantId);
        if (fromDt != null && toDt != null && fromDt.isAfter(toDt)) {
            throw badRequest("가입고일 시작일은 종료일보다 늦을 수 없습니다.");
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("fromDt", fromDt);
        params.put("toDt", toDt);
        params.put("supplierKeyword", normalize(supplierKeyword));
        params.put("materialKeyword", normalize(materialKeyword));
        params.put("keyword", normalize(keyword));
        return inspectionDAO.selectCandidates(params);
    }

    @Override
    public int countWaiting(Long tenantId) throws Exception {
        requireTenant(tenantId);
        Integer count = inspectionDAO.countWaitingCandidates(tenantParams(tenantId));
        return count == null ? 0 : count;
    }

    @Override
    public QualityInspectionVO getInspection(Long tenantId, Long qualityInspectionId) throws Exception {
        requireTenant(tenantId);
        if (qualityInspectionId == null || qualityInspectionId < 1L) {
            throw notFound();
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("qualityInspectionId", qualityInspectionId);
        QualityInspectionVO inspection = inspectionDAO.selectInspection(params);
        if (inspection == null) {
            throw notFound();
        }
        inspection.setDetails(inspectionDAO.selectInspectionDetails(params));
        return inspection;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public QualityInspectionVO createInspection(Long tenantId, String userId, QualityInspectionSaveRequestVO payload)
            throws Exception {
        requirePrincipal(tenantId, userId);
        validateHeader(payload);
        String remark = validateRemark(payload.getRemark());
        if (payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("검사할 가입고 품목을 선택해 주세요.");
        }
        if (payload.getDetails().size() > MAX_DETAILS) {
            throw badRequest("한 번에 검사할 수 있는 품목은 " + MAX_DETAILS + "행까지입니다.");
        }
        TreeSet<Long> arrivalDetailIds = new TreeSet<Long>();
        List<PreparedRow> rows = new ArrayList<PreparedRow>();
        for (QualityInspectionDetailSaveRequestVO detail : payload.getDetails()) {
            if (detail == null || detail.getPurchaseArrivalDetailId() == null) {
                throw badRequest("검사할 가입고 품목을 선택해 주세요.");
            }
            if (!arrivalDetailIds.add(detail.getPurchaseArrivalDetailId())) {
                throw badRequest("같은 가입고 품목을 중복해서 검사할 수 없습니다.");
            }
            rows.add(prepareRow(detail, detail.getPurchaseArrivalDetailId()));
        }
        PurchaseRequestRequesterVO inspector = resolveInspector(tenantId, userId, payload.getInspectorId());

        Map<Long, QualityInspectionArrivalRowVO> arrivalRows = lockArrivalRows(tenantId, arrivalDetailIds, null);
        for (PreparedRow row : rows) {
            QualityInspectionArrivalRowVO arrivalRow = arrivalRows.get(row.arrivalDetailId);
            if (arrivalRow == null || !"Y".equals(arrivalRow.getArrivalUseAt())
                    || !"Y".equals(arrivalRow.getInspectAt())) {
                throw itemsChanged();
            }
            requireWithinWaiting(arrivalRow, row);
        }

        Map<String, Object> hd = tenantParams(tenantId);
        hd.put("inspectionNo", generateNo(tenantId, payload.getInspectionDt()));
        hd.put("inspectionDt", payload.getInspectionDt());
        hd.put("inspectorId", inspector.getUserId());
        hd.put("inspectorDeptId", inspector.getDepartmentId());
        hd.put("remark", remark);
        hd.put("createdBy", userId);
        Long qualityInspectionId = inspectionDAO.insertInspectionHeader(hd);
        if (qualityInspectionId == null || qualityInspectionId < 1L) {
            throw new IllegalStateException("수입검사 헤더 저장에 실패했습니다.");
        }
        int lineNo = 1;
        for (PreparedRow row : rows) {
            QualityInspectionArrivalRowVO arrivalRow = arrivalRows.get(row.arrivalDetailId);
            Map<String, Object> dt = tenantParams(tenantId);
            dt.put("qualityInspectionId", qualityInspectionId);
            dt.put("lineNo", lineNo++);
            dt.put("purchaseArrivalDetailId", row.arrivalDetailId);
            dt.put("arrivalNo", arrivalRow.getArrivalNo());
            dt.put("purchaseOrderDetailId", arrivalRow.getPurchaseOrderDetailId());
            dt.put("materialId", arrivalRow.getMaterialId());
            dt.put("passQty", row.passQty);
            dt.put("failQty", row.failQty);
            dt.put("remark", row.remark);
            dt.put("createdBy", userId);
            Long detailId = inspectionDAO.insertInspectionDetail(dt);
            if (detailId == null || detailId < 1L) {
                throw new IllegalStateException("수입검사 상세 저장에 실패했습니다.");
            }
        }
        return getInspection(tenantId, qualityInspectionId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public QualityInspectionVO updateInspection(Long tenantId, String userId, Long qualityInspectionId,
            QualityInspectionSaveRequestVO payload) throws Exception {
        requirePrincipal(tenantId, userId);
        lockEditableInspection(tenantId, qualityInspectionId, "취소된 검사는 수정할 수 없습니다.");
        validateHeader(payload);
        String remark = validateRemark(payload.getRemark());
        if (payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("모든 행을 뺄 수 없습니다. 검사 취소를 사용해 주세요.");
        }

        Map<Long, QualityInspectionDetailVO> existingById = loadRows(tenantId, qualityInspectionId);
        Map<Long, PreparedRow> requestedById = new LinkedHashMap<Long, PreparedRow>();
        for (QualityInspectionDetailSaveRequestVO detail : payload.getDetails()) {
            if (detail == null || detail.getQualityInspectionDetailId() == null
                    || !existingById.containsKey(detail.getQualityInspectionDetailId())
                    || requestedById.containsKey(detail.getQualityInspectionDetailId())) {
                throw badRequest("검사 상세 정보가 올바르지 않습니다. 화면을 다시 조회해 주세요.");
            }
            requestedById.put(detail.getQualityInspectionDetailId(),
                    prepareRow(detail, existingById.get(detail.getQualityInspectionDetailId())
                            .getPurchaseArrivalDetailId()));
        }
        PurchaseRequestRequesterVO inspector = resolveInspector(tenantId, userId, payload.getInspectorId());
        requireReceivedRowsUntouched(existingById, requestedById);

        TreeSet<Long> arrivalDetailIds = new TreeSet<Long>();
        for (QualityInspectionDetailVO existing : existingById.values()) {
            if (existing.getPurchaseArrivalDetailId() == null) {
                throw concurrentChange();
            }
            arrivalDetailIds.add(existing.getPurchaseArrivalDetailId());
        }
        Map<Long, QualityInspectionArrivalRowVO> arrivalRows =
                lockArrivalRows(tenantId, arrivalDetailIds, qualityInspectionId);
        for (Map.Entry<Long, PreparedRow> entry : requestedById.entrySet()) {
            QualityInspectionArrivalRowVO arrivalRow =
                    arrivalRows.get(existingById.get(entry.getKey()).getPurchaseArrivalDetailId());
            if (arrivalRow == null || !"Y".equals(arrivalRow.getArrivalUseAt())) {
                throw concurrentChange();
            }
            requireWithinWaiting(arrivalRow, entry.getValue());
        }

        // 행번호 유일 제약 때문에 삭제를 먼저 하고, 남은 행은 기존 행번호 오름차순으로 다시 매긴다.
        for (QualityInspectionDetailVO existing : existingById.values()) {
            if (requestedById.containsKey(existing.getQualityInspectionDetailId())) {
                continue;
            }
            Map<String, Object> deleteParams = tenantParams(tenantId);
            deleteParams.put("qualityInspectionId", qualityInspectionId);
            deleteParams.put("qualityInspectionDetailId", existing.getQualityInspectionDetailId());
            if (inspectionDAO.deleteInspectionDetail(deleteParams) != 1) {
                throw concurrentChange();
            }
        }
        int lineNo = 1;
        for (QualityInspectionDetailVO existing : existingById.values()) {
            PreparedRow row = requestedById.get(existing.getQualityInspectionDetailId());
            if (row == null) {
                continue;
            }
            Map<String, Object> dt = tenantParams(tenantId);
            dt.put("qualityInspectionId", qualityInspectionId);
            dt.put("qualityInspectionDetailId", existing.getQualityInspectionDetailId());
            dt.put("lineNo", lineNo++);
            dt.put("passQty", row.passQty);
            dt.put("failQty", row.failQty);
            dt.put("remark", row.remark);
            dt.put("updatedBy", userId);
            if (inspectionDAO.updateInspectionDetail(dt) != 1) {
                throw concurrentChange();
            }
        }

        Map<String, Object> hd = tenantParams(tenantId);
        hd.put("qualityInspectionId", qualityInspectionId);
        hd.put("inspectionDt", payload.getInspectionDt());
        hd.put("inspectorId", inspector.getUserId());
        hd.put("inspectorDeptId", inspector.getDepartmentId());
        hd.put("remark", remark);
        hd.put("updatedBy", userId);
        if (inspectionDAO.updateInspectionHeader(hd) != 1) {
            throw concurrentChange();
        }
        return getInspection(tenantId, qualityInspectionId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public QualityInspectionVO cancelInspection(Long tenantId, String userId, Long qualityInspectionId)
            throws Exception {
        requirePrincipal(tenantId, userId);
        lockEditableInspection(tenantId, qualityInspectionId, "이미 취소된 검사입니다.");
        for (QualityInspectionDetailVO row : loadRows(tenantId, qualityInspectionId).values()) {
            if (isReceived(row)) {
                throw receivedLocked(row, "취소");
            }
        }
        Map<String, Object> cancelParams = tenantParams(tenantId);
        cancelParams.put("qualityInspectionId", qualityInspectionId);
        cancelParams.put("updatedBy", userId);
        if (inspectionDAO.cancelInspectionHeader(cancelParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 취소된 검사입니다.");
        }
        return getInspection(tenantId, qualityInspectionId);
    }

    /** 수정·취소 대상 검사를 잠그고 취소 여부를 확인한다. */
    private QualityInspectionVO lockEditableInspection(Long tenantId, Long qualityInspectionId,
            String canceledMessage) throws Exception {
        if (qualityInspectionId == null || qualityInspectionId < 1L) {
            throw notFound();
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("qualityInspectionId", qualityInspectionId);
        QualityInspectionVO locked = inspectionDAO.selectInspectionForUpdate(params);
        if (locked == null) {
            throw notFound();
        }
        if (!"Y".equals(locked.getUseAt())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, canceledMessage);
        }
        return locked;
    }

    /**
     * 합격분이 유효 입고에 연결된 행은 검사에서 빼거나 합격량을 입고된 수량 아래로 줄일 수 없다.
     * 불합격량·비고 등은 수정할 수 있다. 입고를 취소하면 제한이 풀린다(입고 합에서 빠진다).
     */
    private void requireReceivedRowsUntouched(Map<Long, QualityInspectionDetailVO> existingById,
            Map<Long, PreparedRow> requestedById) {
        for (QualityInspectionDetailVO existing : existingById.values()) {
            if (!isReceived(existing)) {
                continue;
            }
            PreparedRow requested = requestedById.get(existing.getQualityInspectionDetailId());
            if (requested == null) {
                throw receivedLocked(existing, "행 빼기");
            }
            if (requested.passQty.compareTo(existing.getReceivedQty()) < 0) {
                throw receivedLocked(existing, "합격량 변경");
            }
        }
    }

    private static boolean isReceived(QualityInspectionDetailVO row) {
        return row.getReceivedQty() != null && row.getReceivedQty().signum() > 0;
    }

    private ResponseStatusException receivedLocked(QualityInspectionDetailVO row, String action) {
        String receipt = row.getReceiptNo() == null ? "" : " 입고 " + row.getReceiptNo() + "에서 처리해 주세요.";
        return new ResponseStatusException(HttpStatus.CONFLICT, "합격분이 입고된 품목(" + row.getArrivalNo() + ")은 "
                + action + "할 수 없습니다. 입고 수량(" + row.getReceivedQty().stripTrailingZeros().toPlainString()
                + ")보다 합격량을 줄이거나 행을 빼거나 검사를 취소하려면 먼저 입고를 취소해야 합니다." + receipt);
    }

    private Map<Long, QualityInspectionDetailVO> loadRows(Long tenantId, Long qualityInspectionId) throws Exception {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("qualityInspectionId", qualityInspectionId);
        Map<Long, QualityInspectionDetailVO> byId = new LinkedHashMap<Long, QualityInspectionDetailVO>();
        for (QualityInspectionDetailVO detail : inspectionDAO.selectInspectionDetails(params)) {
            byId.put(detail.getQualityInspectionDetailId(), detail);
        }
        return byId;
    }

    /**
     * 가입고 행을 ID 순서로 잠근 뒤 같은 행을 다시 읽어 최신 검사량 합계를 쓴다.
     * 잠금 대기 중 다른 검사가 커밋되면 첫 조회의 합계는 오래된 값일 수 있어, 잠근 뒤 새 문장으로 다시 조회한다.
     * excludeInspectionId의 검사는 검사량 합에서 뺀다(수정 중인 검사 자신).
     */
    private Map<Long, QualityInspectionArrivalRowVO> lockArrivalRows(Long tenantId, TreeSet<Long> detailIds,
            Long excludeInspectionId) throws Exception {
        inspectionDAO.selectArrivalRows(arrivalRowParams(tenantId, detailIds, excludeInspectionId, true));
        Map<Long, QualityInspectionArrivalRowVO> byId = new HashMap<Long, QualityInspectionArrivalRowVO>();
        for (QualityInspectionArrivalRowVO row : inspectionDAO
                .selectArrivalRows(arrivalRowParams(tenantId, detailIds, excludeInspectionId, false))) {
            byId.put(row.getPurchaseArrivalDetailId(), row);
        }
        return byId;
    }

    private Map<String, Object> arrivalRowParams(Long tenantId, TreeSet<Long> detailIds, Long excludeInspectionId,
            boolean forUpdate) {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("detailIds", new ArrayList<Long>(detailIds));
        if (excludeInspectionId != null) {
            params.put("excludeInspectionId", excludeInspectionId);
        }
        params.put("forUpdate", Boolean.valueOf(forUpdate));
        return params;
    }

    private void requireWithinWaiting(QualityInspectionArrivalRowVO arrivalRow, PreparedRow row) {
        BigDecimal inspected = arrivalRow.getInspectedQty() == null ? BigDecimal.ZERO : arrivalRow.getInspectedQty();
        BigDecimal waiting = arrivalRow.getArrivalQty().subtract(inspected);
        if (row.passQty.add(row.failQty).compareTo(waiting) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, arrivalRow.getMaterialName() + "("
                    + arrivalRow.getArrivalNo() + ")의 검사량이 검사 대기량 " + waiting.stripTrailingZeros().toPlainString()
                    + "을(를) 초과했습니다.");
        }
    }

    private PreparedRow prepareRow(QualityInspectionDetailSaveRequestVO detail, Long arrivalDetailId) {
        BigDecimal passQty = decimal(detail.getPassQty(), "합격량");
        BigDecimal failQty = decimal(detail.getFailQty(), "불합격량");
        if (passQty.signum() < 0 || failQty.signum() < 0) {
            throw badRequest("합격량과 불합격량은 0 이상이어야 합니다.");
        }
        if (passQty.add(failQty).signum() <= 0) {
            throw badRequest("합격량과 불합격량의 합은 0보다 커야 합니다.");
        }
        return new PreparedRow(arrivalDetailId, passQty, failQty, validateRemark(detail.getRemark()));
    }

    private void validateHeader(QualityInspectionSaveRequestVO payload) {
        if (payload == null) {
            throw badRequest("검사 정보를 입력해 주세요.");
        }
        if (payload.getInspectionDt() == null) {
            throw badRequest("검사일을 입력해 주세요.");
        }
    }

    private String validateRemark(String value) {
        String remark = normalize(value);
        if (remark != null && remark.length() > REMARK_MAX_LENGTH) {
            throw badRequest("비고는 " + REMARK_MAX_LENGTH + "자 이내로 입력해 주세요.");
        }
        return remark;
    }

    /** 검사자를 정한다. 요청에 검사자가 있으면 같은 테넌트의 사용자인지 확인하고, 없으면 로그인 사용자다. */
    private PurchaseRequestRequesterVO resolveInspector(Long tenantId, String userId, Long inspectorId)
            throws Exception {
        if (inspectorId != null) {
            Map<String, Object> params = tenantParams(tenantId);
            params.put("userId", inspectorId);
            PurchaseRequestRequesterVO inspector = inspectionDAO.selectInspector(params);
            if (inspector == null || inspector.getUserId() == null) {
                throw badRequest("사용할 수 없는 검사자입니다.");
            }
            return inspector;
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("loginCode", userId);
        PurchaseRequestRequesterVO inspector = requestDAO.selectRequester(params);
        if (inspector == null || inspector.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "검사자 사용자 정보를 찾을 수 없습니다.");
        }
        return inspector;
    }

    private String generateNo(Long tenantId, LocalDate dt) throws Exception {
        String dateKey = dt.toString().replace("-", "");
        Long sequence = idSequenceService.nextValue(INSPECTION_NO_GENERATOR_KEY, tenantId.toString(), dateKey);
        if (sequence == null || sequence < 1L) {
            throw new IllegalStateException("검사번호를 생성할 수 없습니다.");
        }
        String no = String.format(Locale.ROOT, "%s-%s-%04d", "QI", dateKey, sequence);
        if (no.length() > NO_MAX_LENGTH) {
            throw new IllegalStateException("검사번호를 생성할 수 없습니다.");
        }
        return no;
    }

    private BigDecimal decimal(BigDecimal value, String label) {
        if (value == null) {
            throw badRequest(label + "을(를) 입력해 주세요.");
        }
        BigDecimal normalized;
        try {
            normalized = value.setScale(SCALE, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw badRequest(label + "은(는) 소수 둘째 자리까지 입력할 수 있습니다.");
        }
        if (normalized.precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest(label + "이(가) 허용 범위를 초과했습니다.");
        }
        return normalized;
    }

    private void requireTenant(Long tenantId) {
        if (tenantId == null || tenantId < 1L) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private void requirePrincipal(Long tenantId, String userId) {
        requireTenant(tenantId);
        if (!StringUtils.hasText(userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private Map<String, Object> tenantParams(Long tenantId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        return params;
    }

    private static String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "검사를 찾을 수 없습니다.");
    }

    private ResponseStatusException itemsChanged() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "검사할 가입고 품목이 변경되었습니다. 화면을 다시 조회해 주세요.");
    }

    private ResponseStatusException concurrentChange() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "검사 또는 가입고가 동시에 변경되었습니다. 다시 조회해 주세요.");
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static final class PreparedRow {
        private final Long arrivalDetailId;
        private final BigDecimal passQty;
        private final BigDecimal failQty;
        private final String remark;

        private PreparedRow(Long arrivalDetailId, BigDecimal passQty, BigDecimal failQty, String remark) {
            this.arrivalDetailId = arrivalDetailId;
            this.passQty = passQty;
            this.failQty = failQty;
            this.remark = remark;
        }
    }
}
