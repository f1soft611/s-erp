package egovframework.let.sales.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Map;

import org.junit.jupiter.api.Test;

import egovframework.com.cmm.DecimalColumnContract;

class DecimalColumnContractTest {
    @Test
    void loadsTheSharedFrontendContractFromTheServerClasspath() {
        Map<String, Object> order = DecimalColumnContract.forDocument("sales.order");
        assertEquals("decimal", ((Map<?, ?>) order.get("unitPrice")).get("type"));
        assertEquals("currency", ((Map<?, ?>) order.get("totalAmount")).get("type"));
    }

    @Test
    void rejectsUnknownDocuments() {
        assertThrows(IllegalArgumentException.class, () -> DecimalColumnContract.forDocument("unknown"));
    }
}
