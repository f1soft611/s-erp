package egovframework.let.quality.inspect.status.service.impl;

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

import egovframework.let.quality.inspect.status.domain.model.QualityInspectionStatusSearchVO;
import egovframework.let.quality.inspect.status.domain.model.QualityInspectionStatusVO;
import egovframework.let.quality.inspect.status.domain.repository.QualityInspectionStatusDAO;
import egovframework.let.quality.inspect.status.service.QualityInspectionStatusService;

/**
 * 자재수입검사현황 검색 조건을 정규화하고 조회하는 서비스 구현 클래스.
 * 상태 조건은 정상(기본)·취소·전체 세 가지이며, 값이 없으면 취소건을 제외한다.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Service("qualityInspectionStatusService")
public class QualityInspectionStatusServiceImpl extends EgovAbstractServiceImpl
        implements QualityInspectionStatusService {

    private static final String ACTIVE = "ACTIVE";
    private static final String CANCELED = "CANCELED";
    private static final String ALL = "ALL";

    private final QualityInspectionStatusDAO qualityInspectionStatusDAO;

    public QualityInspectionStatusServiceImpl(QualityInspectionStatusDAO qualityInspectionStatusDAO) {
        this.qualityInspectionStatusDAO = qualityInspectionStatusDAO;
    }

    @Override
    public List<QualityInspectionStatusVO> selectInspectionStatusList(Long tenantId,
            QualityInspectionStatusSearchVO search) throws Exception {
        if (tenantId == null || tenantId < 1L) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        QualityInspectionStatusSearchVO condition = search == null ? new QualityInspectionStatusSearchVO() : search;
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("keyword", text(condition.getKeyword()));
        params.put("inspectionNo", text(condition.getInspectionNo()));
        params.put("supplierKeyword", text(condition.getSupplierKeyword()));
        params.put("materialKeyword", text(condition.getMaterialKeyword()));
        params.put("orderNo", text(condition.getOrderNo()));
        params.put("arrivalNo", text(condition.getArrivalNo()));
        params.put("inspectorKeyword", text(condition.getInspectorKeyword()));
        params.put("status", status(condition.getStatus()));
        LocalDate from = date(condition.getInspectionDtFrom());
        LocalDate to = date(condition.getInspectionDtTo());
        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시작일이 종료일보다 늦습니다.");
        }
        params.put("inspectionDtFrom", from == null ? null : from.toString());
        params.put("inspectionDtTo", to == null ? null : to.toString());
        return qualityInspectionStatusDAO.selectInspectionStatusList(params);
    }

    /** 상태 조건이 없으면 정상만 조회한다(취소건은 취소·전체를 고를 때만 나온다). */
    private String status(String value) {
        String text = text(value);
        if (text == null) {
            return ACTIVE;
        }
        if (!ACTIVE.equals(text) && !CANCELED.equals(text) && !ALL.equals(text)) {
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
