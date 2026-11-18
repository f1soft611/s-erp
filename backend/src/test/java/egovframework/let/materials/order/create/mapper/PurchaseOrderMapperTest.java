package egovframework.let.materials.order.create.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class PurchaseOrderMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/materials/order/create/EgovPurchaseOrderCreate_SQL_postgresql.xml";
    private static final String CONFIRM_RESOURCE =
            "egovframework/mapper/let/materials/request/confirm/EgovPurchaseRequestConfirm_SQL_postgresql.xml";

    @Test
    void everyStatementIsTenantScoped() throws Exception {
        Configuration configuration = parse(RESOURCE);
        for (String id : Arrays.asList("selectCandidates", "selectConfirmRows", "selectMaterialDefault",
                "existsTaxType", "insertOrderHeader", "insertOrderDetail", "selectOrder", "selectOrderDetails",
                "selectOrderForUpdate", "updateOrderHeader", "updateOrderDetail", "deleteOrderDetail",
                "cancelOrderHeader", "updateAutoRequestDetail", "deleteAutoRequestDetail", "refreshConfirmTotal",
                "updateReceiptClose", "selectOrderPrint", "selectOrderPrintDetails", "updatePrintMark")) {
            assertThat(sql(configuration, "PurchaseOrderDAO." + id, null)).as(id)
                    .containsPattern("tenant_id = \\?|tenant_id, order_no|purchase_order_id, tenant_id");
        }
    }

    @Test
    void candidatesAreRemainingQuantityOfActiveNotClosedConfirmedRows() throws Exception {
        assertThat(sql(parse(RESOURCE), "PurchaseOrderDAO.selectCandidates", null))
                .contains("pc.use_at = 'Y'", "d.order_close_at = 'N'", "oh.use_at = 'Y'",
                        "d.confirm_qty - COALESCE(o.ordered_qty, 0) > 0", "AS remainQty",
                        "CAST(NULL AS numeric) AS stockQty", "m.inspect_type", "LIMIT 500");
    }

    @Test
    void confirmRowsLockOnlyWhenRequested() throws Exception {
        Configuration configuration = parse(RESOURCE);
        Map<String, Object> locked = params(Boolean.TRUE);
        Map<String, Object> plain = params(Boolean.FALSE);
        assertThat(sql(configuration, "PurchaseOrderDAO.selectConfirmRows", locked))
                .contains("ORDER BY d.purchase_request_detail_id", "FOR UPDATE OF d");
        assertThat(sql(configuration, "PurchaseOrderDAO.selectConfirmRows", plain))
                .doesNotContain("FOR UPDATE");
    }

    @Test
    void orderRowsStoreSeparateAmountsAndLinkToConfirmRow() throws Exception {
        Configuration configuration = parse(RESOURCE);
        assertThat(sql(configuration, "PurchaseOrderDAO.insertOrderHeader", null))
                .contains("tb_purchase_order_hd", "source_type", "tax_type", "vat_included_at",
                        "RETURNING purchase_order_id");
        assertThat(sql(configuration, "PurchaseOrderDAO.insertOrderDetail", null))
                .contains("tb_purchase_order_dt", "purchase_request_detail_id", "inspect_at", "supply_amt",
                        "vat_amt", "total_amt", "RETURNING purchase_order_detail_id");
    }

    @Test
    void updateAndCancelStatementsKeepHistoryAndGuardActiveOrders() throws Exception {
        Configuration configuration = parse(RESOURCE);
        assertThat(sql(configuration, "PurchaseOrderDAO.selectOrderForUpdate", null)).contains("FOR UPDATE OF oh");
        // 가입고가 있는 발주의 헤더 잠금 검증이 저장된 값과 비교할 수 있도록 발주일·부가세 설정을 함께 읽는다.
        assertThat(sql(configuration, "PurchaseOrderDAO.selectOrderForUpdate", null))
                .contains("oh.order_dt AS orderDt", "oh.tax_type AS taxType", "oh.vat_included_at AS vatIncludedAt");
        assertThat(sql(configuration, "PurchaseOrderDAO.updateOrderHeader", null))
                .contains("tb_purchase_order_hd", "use_at = 'Y'", "updated_by = ?", "total_amt = ?");
        assertThat(sql(configuration, "PurchaseOrderDAO.cancelOrderHeader", null))
                .contains("use_at = 'N'", "AND use_at = 'Y'").doesNotContain("DELETE");
        assertThat(sql(configuration, "PurchaseOrderDAO.updateOrderDetail", null))
                .contains("line_no = ?", "purchase_order_id = ?", "supply_amt = ?");
        assertThat(sql(configuration, "PurchaseOrderDAO.updateAutoRequestDetail", null))
                .contains("request_qty = ?", "confirm_qty = ?", "amount = ?");
        assertThat(sql(configuration, "PurchaseOrderDAO.refreshConfirmTotal", null)).contains("sum(d.amount)");
        // 입고대기 마감은 마감 값 컬럼만 바꾼다(수량·단가·금액 컬럼 없음)
        String close = sql(configuration, "PurchaseOrderDAO.updateReceiptClose", null);
        assertThat(close).contains("receipt_close_at = ?", "receipt_close_at <> ?", "updated_by = ?")
                .doesNotContain("order_qty", "unit_price", "supply_amt", "total_amt", "delivery_dt");
        assertThat(sql(configuration, "PurchaseOrderDAO.selectOrderDetails", null))
                .contains("AS confirmQty", "AS remainQty", "o2.purchase_order_detail_id <> od.purchase_order_detail_id",
                        "h2.use_at = 'Y'");
    }

    @Test
    void orderInsertCopiesCompanyVendorAndOrdererSnapshots() throws Exception {
        String insert = sql(parse(RESOURCE), "PurchaseOrderDAO.insertOrderHeader", null);
        assertThat(insert).contains("FROM tb_tenant t", "LEFT JOIN tb_customer_info c", "LEFT JOIN tb_user u",
                "company_name", "company_stamp_image", "company_logo_image", "vendor_name", "vendor_telephone_no",
                "vendor_charge", "orderer_name", "orderer_mobile_no", "t.tenant_nm", "t.stamp_image", "t.logo_image",
                "c.customer_name", "c.customer_charge", "u.user_nm", "u.mobile_no", "RETURNING purchase_order_id");
    }

    @Test
    void printQueryPrefersSnapshotAndFallsBackToCurrentInformation() throws Exception {
        Configuration configuration = parse(RESOURCE);
        String print = sql(configuration, "PurchaseOrderDAO.selectOrderPrint", null);
        assertThat(print).contains("COALESCE(oh.company_name, t.tenant_nm)", "COALESCE(oh.company_stamp_image, t.stamp_image)",
                "COALESCE(oh.company_logo_image, t.logo_image)", "COALESCE(oh.vendor_name, c.customer_name)",
                "COALESCE(oh.vendor_charge, c.customer_charge)", "COALESCE(oh.orderer_name, u.user_nm)",
                "COALESCE(oh.orderer_mobile_no, u.mobile_no)", "oh.total_amt AS totalAmt", "oh.use_at AS useAt");
        assertThat(sql(configuration, "PurchaseOrderDAO.selectOrderPrintDetails", null))
                .contains("od.delivery_dt AS deliveryDt", "ORDER BY od.line_no");
        String mark = sql(configuration, "PurchaseOrderDAO.updatePrintMark", null);
        assertThat(mark).contains("print_at = 'Y'", "printed_at = now()", "printed_by = ?", "AND use_at = 'Y'")
                .doesNotContain("order_qty", "unit_price", "total_amt", "supply_amt");
    }

    @Test
    void confirmCancelChecksForActiveOrders() throws Exception {
        assertThat(sql(parse(CONFIRM_RESOURCE), "PurchaseRequestConfirmDAO.existsActiveOrderByConfirm", null))
                .contains("tb_purchase_order_dt", "oh.use_at = 'Y'", "d.purchase_confirm_id = ?",
                        "oh.tenant_id = ?");
    }

    private static Map<String, Object> params(Boolean forUpdate) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 1L);
        params.put("detailIds", Arrays.asList(1L, 2L));
        params.put("forUpdate", forUpdate);
        return params;
    }

    private static Configuration parse(String resource) throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(resource)) {
            new XMLMapperBuilder(input, configuration, resource, configuration.getSqlFragments()).parse();
        }
        return configuration;
    }

    private static String sql(Configuration configuration, String id, Map<String, Object> params) {
        Map<String, Object> bound = params == null ? params(Boolean.TRUE) : params;
        return configuration.getMappedStatement(id).getBoundSql(bound).getSql().replaceAll("\\s+", " ");
    }
}
