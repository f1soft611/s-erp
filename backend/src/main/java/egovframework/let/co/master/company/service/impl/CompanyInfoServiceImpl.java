package egovframework.let.co.master.company.service.impl;

import java.util.HashMap;
import java.util.Map;
import java.util.Base64;
import java.util.Iterator;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.co.master.company.domain.model.CompanyInfoVO;
import egovframework.let.co.master.company.domain.repository.CompanyInfoDAO;
import egovframework.let.co.master.company.service.CompanyInfoService;

@Service("companyInfoService")
public class CompanyInfoServiceImpl extends EgovAbstractServiceImpl implements CompanyInfoService {

    private final CompanyInfoDAO companyInfoDAO;

    public CompanyInfoServiceImpl(CompanyInfoDAO companyInfoDAO) {
        this.companyInfoDAO = companyInfoDAO;
    }

    @Override
    public CompanyInfoVO getCompanyInfo(Long tenantId) throws Exception {
        validateTenantId(tenantId);
        CompanyInfoVO companyInfo = companyInfoDAO.selectCompanyInfo(tenantId);
        if (companyInfo == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "회사정보를 찾을 수 없습니다.");
        }
        return companyInfo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CompanyInfoVO updateCompanyInfo(Long tenantId, CompanyInfoVO payload) throws Exception {
        validateTenantId(tenantId);
        validatePayload(payload);

        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("companyName", normalizedValue(payload.getCompanyName()));
        params.put("businessNo", normalizedValue(payload.getBusinessNo()));
        params.put("businessType", normalizedValue(payload.getBusinessType()));
        params.put("businessCategory", normalizedValue(payload.getBusinessCategory()));
        params.put("presidentName", normalizedValue(payload.getPresidentName()));
        params.put("postCode", normalizedValue(payload.getPostCode()));
        params.put("address", normalizedValue(payload.getAddress()));
        params.put("telephoneNo", normalizedValue(payload.getTelephoneNo()));
        params.put("facsimileNo", normalizedValue(payload.getFacsimileNo()));
        params.put("stampImage", payload.getStampImage());

        if (companyInfoDAO.updateCompanyInfo(params) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "회사정보를 찾을 수 없습니다.");
        }
        return getCompanyInfo(tenantId);
    }

    private void validateTenantId(Long tenantId) {
        if (tenantId == null || tenantId.longValue() <= 0) {
            throw new IllegalArgumentException("인증 테넌트 정보가 필요합니다.");
        }
    }

    private void validatePayload(CompanyInfoVO payload) {
        if (payload == null || !StringUtils.hasText(payload.getCompanyName())) {
            throw new IllegalArgumentException("회사명은 필수입니다.");
        }
        requireMaxLength("회사명", normalizedValue(payload.getCompanyName()), 200);
        requireMaxLength("사업자등록번호", normalizedValue(payload.getBusinessNo()), 12);
        requireMaxLength("업종", normalizedValue(payload.getBusinessType()), 200);
        requireMaxLength("업태", normalizedValue(payload.getBusinessCategory()), 200);
        requireMaxLength("대표자명", normalizedValue(payload.getPresidentName()), 100);
        requireMaxLength("우편번호", normalizedValue(payload.getPostCode()), 20);
        requireMaxLength("주소", normalizedValue(payload.getAddress()), 500);
        requireMaxLength("전화번호", normalizedValue(payload.getTelephoneNo()), 50);
        requireMaxLength("팩스번호", normalizedValue(payload.getFacsimileNo()), 50);
        validateStampImage(payload.getStampImage());
    }

    private void validateStampImage(String image) {
        if (image == null || image.isEmpty()) return;
        String png = "data:image/png;base64,";
        String jpeg = "data:image/jpeg;base64,";
        boolean isPng = image.startsWith(png);
        if (!isPng && !image.startsWith(jpeg)) {
            throw new IllegalArgumentException("직인은 PNG 또는 JPEG 이미지여야 합니다.");
        }
        String encoded = image.substring(isPng ? png.length() : jpeg.length());
        if (encoded.length() > 699052) throw new IllegalArgumentException("직인은 512KB 이하여야 합니다.");
        try {
            byte[] bytes = Base64.getDecoder().decode(encoded);
            if (bytes.length == 0 || bytes.length > 512 * 1024) throw new IllegalArgumentException("직인은 512KB 이하여야 합니다.");
            try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                if (input == null) throw new IllegalArgumentException("직인 이미지를 읽을 수 없습니다.");
                Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw new IllegalArgumentException("직인 이미지가 올바르지 않습니다.");
                ImageReader reader = readers.next();
                try {
                    reader.setInput(input, true, true);
                    String format = reader.getFormatName();
                    if (!(isPng ? "png".equalsIgnoreCase(format) : "JPEG".equalsIgnoreCase(format))
                            || (long) reader.getWidth(0) * reader.getHeight(0) > 16777216L || reader.read(0) == null) {
                        throw new IllegalArgumentException("직인 이미지가 올바르지 않습니다.");
                    }
                } finally {
                    reader.dispose();
                }
            }
        } catch (IOException | IndexOutOfBoundsException ex) {
            throw new IllegalArgumentException("직인 이미지가 올바르지 않습니다.", ex);
        }
    }

    private void requireMaxLength(String label, String value, int maxLength) {
        if (value != null && value.codePointCount(0, value.length()) > maxLength) {
            throw new IllegalArgumentException(label + "은(는) " + maxLength + "자 이하여야 합니다.");
        }
    }

    private String normalizedValue(String value) {
        return value == null ? "" : value.trim();
    }
}
