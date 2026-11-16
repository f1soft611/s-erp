package egovframework.let.sales.quotation.status.controller;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.Collections;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.quotation.status.domain.model.SalesQuotationStatusSearchVO;
import egovframework.let.sales.quotation.status.service.SalesQuotationStatusService;

class SalesQuotationStatusApiControllerTest {
    @Test
    void usesAuthenticatedTenantAndRejectsMissingUser() {
        SalesQuotationStatusService service = mock(SalesQuotationStatusService.class);
        when(service.search(eq(71L), any())).thenReturn(Collections.emptyList());
        SalesQuotationStatusApiController controller = new SalesQuotationStatusApiController(new ResultVoHelper(), service);
        SalesQuotationStatusSearchVO search = new SalesQuotationStatusSearchVO();
        LoginVO user = new LoginVO(); user.setTenantId(71L); user.setId("writer");
        controller.search(search, user);
        verify(service).search(71L, search);
        assertThatThrownBy(() -> controller.search(search, null)).isInstanceOf(ResponseStatusException.class);
    }
}
