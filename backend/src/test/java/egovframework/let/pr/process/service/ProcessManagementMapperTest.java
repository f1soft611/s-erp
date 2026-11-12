package egovframework.let.pr.process.service;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.io.InputStream;
import org.apache.ibatis.builder.xml.XMLConfigBuilder;
import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class ProcessManagementMapperTest {
    @Test
    void loadsPostgresqlStatements() throws Exception {
        Configuration configuration;
        try (InputStream input = Resources.getResourceAsStream("egovframework/mapper/config/mapper-config.xml")) {
            configuration = new XMLConfigBuilder(input).parse();
        }
        String mapper = "egovframework/mapper/let/pr/process/ProcessManagement_SQL_postgresql.xml";
        try (InputStream input = Resources.getResourceAsStream(mapper)) {
            new XMLMapperBuilder(input, configuration, mapper, configuration.getSqlFragments()).parse();
        }
        for (String statement : new String[] {"list", "insertGroup", "insertProcess",
                "updateGroup", "updateProcess", "deleteGroup", "deleteProcess"}) {
            assertNotNull(configuration.getMappedStatement("ProcessManagementDAO." + statement));
        }
    }
}
