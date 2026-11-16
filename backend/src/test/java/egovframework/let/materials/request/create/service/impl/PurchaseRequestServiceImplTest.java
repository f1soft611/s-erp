package egovframework.let.materials.request.create.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestDetailSaveRequestVO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestDetailVO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestRequesterVO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestSaveRequestVO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestVO;
import egovframework.let.materials.request.create.domain.repository.PurchaseRequestDAO;

class PurchaseRequestServiceImplTest {

    private static final Long TENANT = 1L;
    private static final String USER = "user01";

    @Mock
    private PurchaseRequestDAO dao;

    @Mock
    private IdSequenceService idSequenceService;

    private PurchaseRequestServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new PurchaseRequestServiceImpl(dao, idSequenceService);
        PurchaseRequestRequesterVO requester = new PurchaseRequestRequesterVO();
        requester.setUserId(7L);
        requester.setDepartmentId(3L);
        when(dao.selectRequester(anyMap())).thenReturn(requester);
        when(dao.selectMaterialTypeCode(anyMap())).thenReturn("RAW");
        when(dao.existsUseType(anyMap())).thenReturn(true);
        when(dao.insertRequestHeader(anyMap())).thenReturn(300L);
        when(dao.insertRequestDetail(anyMap())).thenReturn(400L);
        when(dao.selectRequest(anyMap())).thenReturn(storedRequest("REQUESTED"));
        when(dao.selectRequestForUpdate(anyMap())).thenReturn(storedRequest("REQUESTED"));
        when(dao.selectRequestDetails(anyMap())).thenReturn(new ArrayList<PurchaseRequestDetailVO>());
        when(dao.updateRequestHeader(anyMap())).thenReturn(1);
        when(dao.updateRequestDetail(anyMap())).thenReturn(1);
        when(dao.deleteRequestDetail(anyMap())).thenReturn(1);
        when(dao.softDeleteRequestHeader(anyMap())).thenReturn(1);
        when(idSequenceService.nextValue("MATERIAL_REQUEST_NO", "1", "20261112")).thenReturn(1L);
    }

    @Test
    void createGeneratesMrNumberAndUsesLoginUserAsRequester() throws Exception {
        service.createRequest(TENANT, USER, validPayload());

        ArgumentCaptor<Map<String, Object>> header = mapCaptor();
        verify(dao).insertRequestHeader(header.capture());
        assertThat(header.getValue())
                .containsEntry("tenantId", TENANT)
                .containsEntry("requestNo", "MR-20261112-0001")
                .containsEntry("requesterId", 7L)
                .containsEntry("requestDeptId", 3L)
                .containsEntry("status", "REQUESTED")
                .containsEntry("createdBy", USER);

        ArgumentCaptor<Map<String, Object>> detail = mapCaptor();
        verify(dao).insertRequestDetail(detail.capture());
        assertThat(detail.getValue())
                .containsEntry("purchaseRequestId", 300L)
                .containsEntry("lineNo", 1)
                .containsEntry("materialId", 101L)
                .containsEntry("useType", "PRODUCTION")
                .containsEntry("createdBy", USER);
        assertThat((BigDecimal) detail.getValue().get("requestQty")).isEqualByComparingTo("10.00");
    }

    @Test
    void createRejectsMissingRequiredDetailValues() {
        PurchaseRequestSaveRequestVO payload = validPayload();
        payload.getDetails().get(0).setRequestQty(BigDecimal.ZERO);
        assertStatus(() -> service.createRequest(TENANT, USER, payload), HttpStatus.BAD_REQUEST);

        PurchaseRequestSaveRequestVO noUseType = validPayload();
        noUseType.getDetails().get(0).setUseType(" ");
        assertStatus(() -> service.createRequest(TENANT, USER, noUseType), HttpStatus.BAD_REQUEST);

        PurchaseRequestSaveRequestVO noDate = validPayload();
        noDate.getDetails().get(0).setRequestDeliveryDt(null);
        assertStatus(() -> service.createRequest(TENANT, USER, noDate), HttpStatus.BAD_REQUEST);

        PurchaseRequestSaveRequestVO noDetails = validPayload();
        noDetails.setDetails(new ArrayList<PurchaseRequestDetailSaveRequestVO>());
        assertStatus(() -> service.createRequest(TENANT, USER, noDetails), HttpStatus.BAD_REQUEST);
    }

    @Test
    void createRejectsUnknownMaterialOrUseTypeInTenant() throws Exception {
        when(dao.existsUseType(anyMap())).thenReturn(false);
        assertStatus(() -> service.createRequest(TENANT, USER, validPayload()), HttpStatus.BAD_REQUEST);

        when(dao.existsUseType(anyMap())).thenReturn(true);
        when(dao.selectMaterialTypeCode(anyMap())).thenReturn(null);
        assertStatus(() -> service.createRequest(TENANT, USER, validPayload()), HttpStatus.NOT_FOUND);
    }

    @Test
    void createAllowsOnlyRawSubAndSupplyMaterialTypes() throws Exception {
        for (String allowed : Arrays.asList("RAW", "SUB", "SUPPLY")) {
            when(dao.selectMaterialTypeCode(anyMap())).thenReturn(allowed);
            service.createRequest(TENANT, USER, validPayload());
        }
        for (String rejected : Arrays.asList("GOODS", "PRODUCT", "SEMI")) {
            when(dao.selectMaterialTypeCode(anyMap())).thenReturn(rejected);
            assertStatus(() -> service.createRequest(TENANT, USER, validPayload()), HttpStatus.BAD_REQUEST);
        }
        verify(dao, times(3)).insertRequestHeader(anyMap());
    }

    @Test
    void updateKeepsChangedRowsDeletesMissingRowsAndInsertsNewRows() throws Exception {
        when(dao.selectRequestDetails(anyMap())).thenReturn(Arrays.asList(
                storedDetail(501L, 1, 101L, "10.00"),
                storedDetail(502L, 2, 102L, "5.00")));

        PurchaseRequestSaveRequestVO payload = validPayload();
        payload.getDetails().get(0).setPurchaseRequestDetailId(501L);
        payload.getDetails().get(0).setRequestQty(new BigDecimal("12"));
        PurchaseRequestDetailSaveRequestVO added = detail(103L, "3");
        payload.getDetails().add(added);

        service.updateRequest(TENANT, USER, 300L, payload);

        verify(dao).deleteRequestDetail(argThat(params -> Long.valueOf(502L).equals(params.get("purchaseRequestDetailId"))));
        verify(dao).updateRequestDetail(argThat(params -> Long.valueOf(501L).equals(params.get("purchaseRequestDetailId"))
                && USER.equals(params.get("updatedBy"))
                && Integer.valueOf(1).equals(params.get("lineNo"))));
        verify(dao).insertRequestDetail(argThat(params -> Long.valueOf(103L).equals(params.get("materialId"))
                && Integer.valueOf(2).equals(params.get("lineNo"))));
        verify(dao).updateRequestHeader(argThat(params -> USER.equals(params.get("updatedBy"))));
    }

    @Test
    void updateSkipsUnchangedDetailSoItsAuditColumnsStay() throws Exception {
        when(dao.selectRequestDetails(anyMap())).thenReturn(Arrays.asList(
                storedDetail(501L, 1, 101L, "10.00")));
        PurchaseRequestSaveRequestVO payload = validPayload();
        payload.getDetails().get(0).setPurchaseRequestDetailId(501L);

        service.updateRequest(TENANT, USER, 300L, payload);

        verify(dao, never()).updateRequestDetail(anyMap());
    }

    @Test
    void updateRejectsDetailIdFromAnotherRequest() throws Exception {
        PurchaseRequestSaveRequestVO payload = validPayload();
        payload.getDetails().get(0).setPurchaseRequestDetailId(999L);
        assertStatus(() -> service.updateRequest(TENANT, USER, 300L, payload), HttpStatus.BAD_REQUEST);
    }

    @Test
    void confirmedRequestCannotBeUpdatedOrDeleted() throws Exception {
        when(dao.selectRequestForUpdate(anyMap())).thenReturn(storedRequest("CONFIRMED"));
        assertStatus(() -> service.updateRequest(TENANT, USER, 300L, validPayload()), HttpStatus.CONFLICT);
        assertStatus(() -> service.deleteRequest(TENANT, USER, 300L), HttpStatus.CONFLICT);
        verify(dao, never()).softDeleteRequestHeader(anyMap());
    }

    @Test
    void deleteSoftDeletesRequestedHeader() throws Exception {
        service.deleteRequest(TENANT, USER, 300L);
        verify(dao).softDeleteRequestHeader(argThat(params -> TENANT.equals(params.get("tenantId"))
                && Long.valueOf(300L).equals(params.get("purchaseRequestId"))
                && USER.equals(params.get("updatedBy"))));
    }

    @Test
    void getReturnsNotFoundForMissingRequest() throws Exception {
        when(dao.selectRequest(anyMap())).thenReturn(null);
        assertStatus(() -> service.getRequest(TENANT, 300L), HttpStatus.NOT_FOUND);
    }

    private interface Action {
        void run() throws Exception;
    }

    private void assertStatus(Action action, HttpStatus status) {
        assertThatThrownBy(action::run)
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatus()).isEqualTo(status));
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
    private ArgumentCaptor<Map<String, Object>> mapCaptor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(Map.class);
    }

    private PurchaseRequestSaveRequestVO validPayload() {
        PurchaseRequestSaveRequestVO payload = new PurchaseRequestSaveRequestVO();
        payload.setRequestDt(LocalDate.of(2026, 11, 12));
        payload.setRemark("메모");
        List<PurchaseRequestDetailSaveRequestVO> details = new ArrayList<PurchaseRequestDetailSaveRequestVO>();
        details.add(detail(101L, "10"));
        payload.setDetails(details);
        return payload;
    }

    private PurchaseRequestDetailSaveRequestVO detail(Long materialId, String qty) {
        PurchaseRequestDetailSaveRequestVO detail = new PurchaseRequestDetailSaveRequestVO();
        detail.setMaterialId(materialId);
        detail.setRequestQty(new BigDecimal(qty));
        detail.setRequestDeliveryDt(LocalDate.of(2026, 11, 20));
        detail.setUseType("PRODUCTION");
        return detail;
    }

    private PurchaseRequestVO storedRequest(String status) {
        PurchaseRequestVO request = new PurchaseRequestVO();
        request.setPurchaseRequestId(300L);
        request.setTenantId(TENANT);
        request.setRequestNo("MR-20261112-0001");
        request.setStatus(status);
        return request;
    }

    private PurchaseRequestDetailVO storedDetail(Long id, int lineNo, Long materialId, String qty) {
        PurchaseRequestDetailVO detail = new PurchaseRequestDetailVO();
        detail.setPurchaseRequestDetailId(id);
        detail.setLineNo(lineNo);
        detail.setMaterialId(materialId);
        detail.setRequestQty(new BigDecimal(qty));
        detail.setRequestDeliveryDt(LocalDate.of(2026, 11, 20));
        detail.setUseType("PRODUCTION");
        return detail;
    }
}
