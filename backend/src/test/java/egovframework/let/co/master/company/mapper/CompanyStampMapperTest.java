package egovframework.let.co.master.company.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class CompanyStampMapperTest {
    @Test
    void absentStampDoesNotOverwriteExistingImageButEmptyStampDeletesIt() throws Exception {
        String resource = "egovframework/mapper/let/co/master/company/CompanyInfo_SQL_postgresql.xml";
        Configuration config = new Configuration();
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(resource)) {
            assertThat(input).isNotNull();
            new XMLMapperBuilder(input, config, resource, config.getSqlFragments()).parse();
        }
        Map<String, Object> params = new HashMap<String, Object>();
        String without = config.getMappedStatement("CompanyInfoDAO.updateCompanyInfo").getBoundSql(params).getSql();
        assertThat(without).doesNotContain("stamp_image");
        params.put("stampImage", "");
        String deletion = config.getMappedStatement("CompanyInfoDAO.updateCompanyInfo").getBoundSql(params).getSql();
        assertThat(deletion).contains("stamp_image = NULLIF(");
    }
}
