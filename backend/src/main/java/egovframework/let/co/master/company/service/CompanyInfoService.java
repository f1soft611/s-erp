package egovframework.let.co.master.company.service;

import egovframework.let.co.master.company.domain.model.CompanyInfoVO;

public interface CompanyInfoService {

    CompanyInfoVO getCompanyInfo(Long tenantId) throws Exception;

    CompanyInfoVO updateCompanyInfo(Long tenantId, CompanyInfoVO payload) throws Exception;
}
