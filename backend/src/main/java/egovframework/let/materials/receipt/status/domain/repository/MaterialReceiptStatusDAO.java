package egovframework.let.materials.receipt.status.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.materials.receipt.status.domain.model.MaterialReceiptStatusVO;

/**
 * 입고현황 조회를 위한 테넌트 범위 MyBatis 데이터 접근 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Repository("materialReceiptStatusDAO")
public class MaterialReceiptStatusDAO extends EgovAbstractMapper {

    public List<MaterialReceiptStatusVO> selectReceiptStatusList(Map<String, Object> params) throws Exception {
        return selectList("MaterialReceiptStatusDAO.selectReceiptStatusList", params);
    }
}
