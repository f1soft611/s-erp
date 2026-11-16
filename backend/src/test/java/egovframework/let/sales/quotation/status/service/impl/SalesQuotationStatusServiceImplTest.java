package egovframework.let.sales.quotation.status.service.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import egovframework.let.sales.quotation.status.domain.model.SalesQuotationStatusSearchVO;
import egovframework.let.sales.quotation.status.domain.repository.SalesQuotationStatusDAO;

class SalesQuotationStatusServiceImplTest {
    @Test
    void requiresValidQuotationRangeAndRejectsReversedSubmissionRange() {
        SalesQuotationStatusDAO dao = mock(SalesQuotationStatusDAO.class);
        SalesQuotationStatusServiceImpl service = new SalesQuotationStatusServiceImpl(dao);
        SalesQuotationStatusSearchVO search = new SalesQuotationStatusSearchVO();
        assertThatThrownBy(() -> service.search(71L, search)).isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException)e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        search.setQuotationDtFrom("2026-11-01"); search.setQuotationDtTo("2026-11-30");
        search.setSubmitDtFrom("2026-11-30"); search.setSubmitDtTo("2026-11-01");
        assertThatThrownBy(() -> service.search(71L, search)).isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(dao);
        search.setSubmitDtFrom(null); search.setSubmitDtTo(null);
        search.setMaterialKeyword(" item ");
        service.search(71L, search);
        verify(dao).selectList(argThat((java.util.Map<String, Object> p) -> Long.valueOf(71).equals(p.get("tenantId"))
                && LocalDate.of(2026, 11, 1).equals(p.get("quotationDtFrom"))
                && "item".equals(p.get("materialKeyword"))));
    }
}
