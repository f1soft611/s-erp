package egovframework.let.co.master.company.domain.repository;

import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.master.company.domain.model.CompanyInfoVO;

@Repository("companyInfoDAO")
public class CompanyInfoDAO extends EgovAbstractMapper {

    public CompanyInfoVO selectCompanyInfo(Long tenantId) throws Exception {
        return selectOne("CompanyInfoDAO.selectCompanyInfo", tenantId);
    }

    public int updateCompanyInfo(Map<String, Object> params) throws Exception {
        return update("CompanyInfoDAO.updateCompanyInfo", params);
    }
}
