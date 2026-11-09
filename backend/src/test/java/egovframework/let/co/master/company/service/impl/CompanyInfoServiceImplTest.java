package egovframework.let.co.master.company.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.Base64;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import egovframework.let.co.master.company.domain.model.CompanyInfoVO;
import egovframework.let.co.master.company.domain.repository.CompanyInfoDAO;

@ExtendWith(MockitoExtension.class)
class CompanyInfoServiceImplTest {

    @Mock
    private CompanyInfoDAO companyInfoDAO;

    private CompanyInfoServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CompanyInfoServiceImpl(companyInfoDAO);
    }

    @Test
    void updateCompanyInfoTrimsFieldsAndWritesOnlyTheAuthenticatedTenant() throws Exception {
        CompanyInfoVO existing = new CompanyInfoVO();
        existing.setCompanyName("Example Co.");
        existing.setBusinessNo("123-45-67890");
        existing.setBusinessType("제조업");
        existing.setBusinessCategory("전자부품");
        existing.setPresidentName("홍길동");
        existing.setPostCode("01234");
        existing.setAddress("서울시 중구 세종대로 1");
        existing.setTelephoneNo("02-1234-5678");
        existing.setFacsimileNo("02-1234-5679");

        CompanyInfoVO request = new CompanyInfoVO();
        request.setCompanyName(" Example Co. ");
        request.setBusinessNo(" 123-45-67890 ");
        request.setBusinessType(" 제조업 ");
        request.setBusinessCategory(" 전자부품 ");
        request.setPresidentName(" 홍길동 ");
        request.setPostCode(" 01234 ");
        request.setAddress(" 서울시 중구 세종대로 1 ");
        request.setTelephoneNo(" 02-1234-5678 ");
        request.setFacsimileNo(" 02-1234-5679 ");

        when(companyInfoDAO.updateCompanyInfo(any(Map.class))).thenReturn(1);
        when(companyInfoDAO.selectCompanyInfo(9L)).thenReturn(existing);

        CompanyInfoVO saved = service.updateCompanyInfo(9L, request);

        assertEquals("Example Co.", saved.getCompanyName());
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(companyInfoDAO).updateCompanyInfo(params.capture());
        assertEquals(9L, params.getValue().get("tenantId"));
        assertEquals("Example Co.", params.getValue().get("companyName"));
        assertEquals("123-45-67890", params.getValue().get("businessNo"));
        assertEquals("제조업", params.getValue().get("businessType"));
        assertEquals("전자부품", params.getValue().get("businessCategory"));
        assertEquals("홍길동", params.getValue().get("presidentName"));
        assertEquals("01234", params.getValue().get("postCode"));
        assertEquals("서울시 중구 세종대로 1", params.getValue().get("address"));
        assertEquals("02-1234-5678", params.getValue().get("telephoneNo"));
        assertEquals("02-1234-5679", params.getValue().get("facsimileNo"));
    }

    @Test
    void rejectsBlankCompanyNameWithoutWriting() throws Exception {
        CompanyInfoVO request = new CompanyInfoVO();
        request.setCompanyName("  ");

        assertThrows(IllegalArgumentException.class, () -> service.updateCompanyInfo(9L, request));
        verifyNoInteractions(companyInfoDAO);
    }

    @Test
    void rejectsAddressLongerThanTheDatabaseColumnBeforeWriting() throws Exception {
        CompanyInfoVO request = new CompanyInfoVO();
        request.setCompanyName("Example Co.");
        request.setAddress(new String(new char[501]).replace('\0', 'a'));

        assertThrows(IllegalArgumentException.class, () -> service.updateCompanyInfo(9L, request));
        verifyNoInteractions(companyInfoDAO);
    }

    @Test
    void rejectsInvalidSealDataBeforeWriting() throws Exception {
        CompanyInfoVO request = new CompanyInfoVO();
        request.setCompanyName("Example Co.");
        request.setStampImage("data:image/png;base64,ZmFrZQ==");
        assertThrows(IllegalArgumentException.class, () -> service.updateCompanyInfo(9L, request));
        verifyNoInteractions(companyInfoDAO);
    }

    @Test
    void passesSealDeletionToTheAuthenticatedTenantUpdate() throws Exception {
        CompanyInfoVO request = new CompanyInfoVO();
        request.setCompanyName("Example Co.");
        request.setStampImage("");
        when(companyInfoDAO.updateCompanyInfo(any(Map.class))).thenReturn(1);
        when(companyInfoDAO.selectCompanyInfo(9L)).thenReturn(request);
        service.updateCompanyInfo(9L, request);
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(companyInfoDAO).updateCompanyInfo(params.capture());
        assertEquals("", params.getValue().get("stampImage"));
    }

    @Test
    void acceptsValidPng() throws Exception {
        CompanyInfoVO request = new CompanyInfoVO();
        request.setCompanyName("Example Co.");
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_ARGB), "png", buffer);
        String seal = "data:image/png;base64," + Base64.getEncoder().encodeToString(buffer.toByteArray());
        request.setStampImage(seal);
        when(companyInfoDAO.updateCompanyInfo(any(Map.class))).thenReturn(1);
        when(companyInfoDAO.selectCompanyInfo(9L)).thenReturn(request);
        service.updateCompanyInfo(9L, request);
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(companyInfoDAO).updateCompanyInfo(params.capture());
        assertEquals(seal, params.getValue().get("stampImage"));
    }

    @Test
    void acceptsValidWideJpegWithinPixelLimit() throws Exception {
        CompanyInfoVO request = new CompanyInfoVO();
        request.setCompanyName("Example Co.");
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(5000, 100, BufferedImage.TYPE_INT_RGB), "jpeg", buffer);
        String seal = "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(buffer.toByteArray());
        request.setStampImage(seal);
        when(companyInfoDAO.updateCompanyInfo(any(Map.class))).thenReturn(1);
        when(companyInfoDAO.selectCompanyInfo(9L)).thenReturn(request);
        service.updateCompanyInfo(9L, request);
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(companyInfoDAO).updateCompanyInfo(params.capture());
        assertEquals(seal, params.getValue().get("stampImage"));
    }

    @Test
    void rejectsOversizedSealBeforeWriting() throws Exception {
        CompanyInfoVO request = new CompanyInfoVO();
        request.setCompanyName("Example Co.");
        request.setStampImage("data:image/png;base64," + new String(new char[699056]).replace('\0', 'A'));
        assertThrows(IllegalArgumentException.class, () -> service.updateCompanyInfo(9L, request));
        verifyNoInteractions(companyInfoDAO);
    }
}
