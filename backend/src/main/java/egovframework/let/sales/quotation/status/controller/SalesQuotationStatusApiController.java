package egovframework.let.sales.quotation.status.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.quotation.status.domain.model.SalesQuotationStatusSearchVO;
import egovframework.let.sales.quotation.status.domain.model.SalesQuotationStatusVO;
import egovframework.let.sales.quotation.status.service.SalesQuotationStatusService;

@RestController
@RequestMapping("/api/v1/sales/quotation-status")
public class SalesQuotationStatusApiController {
    private final ResultVoHelper helper;
    private final SalesQuotationStatusService service;
    public SalesQuotationStatusApiController(ResultVoHelper helper, SalesQuotationStatusService service) {
        this.helper = helper; this.service = service;
    }
    @GetMapping
    public ResultVO search(@ModelAttribute SalesQuotationStatusSearchVO search, @AuthenticationPrincipal LoginVO user) {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        List<SalesQuotationStatusVO> list = service.search(user.getTenantId(), search);
        Map<String, Object> values = new HashMap<>();
        values.put("resultList", list); values.put("resultCnt", list.size());
        return helper.buildFromMap(values, ResponseCode.SUCCESS);
    }
}
