package egovframework.let.groupware.notification;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import javax.xml.parsers.DocumentBuilderFactory;
import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

class PushMapperXmlTest {

    private static final String SUBSCRIPTION_RESOURCE =
            "egovframework/mapper/let/groupware/notification/PushSubscription_SQL_postgresql.xml";
    private static final String DELIVERY_RESOURCE =
            "egovframework/mapper/let/groupware/notification/PushDelivery_SQL_postgresql.xml";

    @Test
    void subscriptionWritesAreBoundToAuthenticatedOwnerAndEndpointConflictsTransferIdempotently()
            throws Exception {
        Document mapper = readMapper(SUBSCRIPTION_RESOURCE);
        String upsert = statement(mapper, "insert", "upsertSubscription");
        String deactivate = statement(mapper, "update", "deactivateSubscription");

        assertTrue(upsert.contains("INSERT INTO public.tb_push_subscription"));
        assertTrue(upsert.contains("( tenant_id, user_id, endpoint_hash"));
        assertTrue(upsert.contains("#{tenantId, jdbcType=BIGINT}")
                && upsert.contains("#{userId, jdbcType=BIGINT}"));
        assertTrue(upsert.contains("ON CONFLICT (endpoint_hash) DO UPDATE"));
        assertTrue(upsert.contains("tenant_id = EXCLUDED.tenant_id"));
        assertTrue(upsert.contains("user_id = EXCLUDED.user_id"));
        assertTrue(upsert.contains("endpoint_ciphertext = EXCLUDED.endpoint_ciphertext"));
        assertTrue(upsert.contains("keys_ciphertext = EXCLUDED.keys_ciphertext"));
        assertTrue(deactivate.contains("tenant_id = #{tenantId, jdbcType=BIGINT}"));
        assertTrue(deactivate.contains("user_id = #{userId, jdbcType=BIGINT}"));
        assertTrue(deactivate.contains("subscription_id = #{subscriptionId, jdbcType=BIGINT}"));
    }

    @Test
    void subscriptionOwnerLockAndStatusLookupAreTenantAndUserScoped() throws Exception {
        Document mapper = readMapper(SUBSCRIPTION_RESOURCE);
        String ownerLock = statement(mapper, "select", "lockSubscriptionOwner");
        String ownedSubscription = statement(mapper, "select", "selectSubscription");
        String endpointLookup = statement(mapper, "select", "selectSubscriptionByEndpointHash");

        assertTrue(ownerLock.contains("FROM public.tb_user"));
        assertTrue(ownerLock.contains("tenant_id = #{tenantId, jdbcType=BIGINT}"));
        assertTrue(ownerLock.contains("user_id = #{userId, jdbcType=BIGINT}"));
        assertTrue(ownerLock.contains("FOR UPDATE"));
        assertTrue(ownedSubscription.contains("tenant_id = #{tenantId, jdbcType=BIGINT}"));
        assertTrue(ownedSubscription.contains("user_id = #{userId, jdbcType=BIGINT}"));
        assertTrue(ownedSubscription.contains("subscription_id = #{subscriptionId, jdbcType=BIGINT}"));
        assertTrue(endpointLookup.contains("endpoint_hash = #{endpointHash, jdbcType=BINARY}"));
    }

    @Test
    void databaseConstraintsMakeOutboxAndDeliveryCreationIdempotent() throws Exception {
        String migration = readText("DATABASE/20261103/20261103_001_create_web_push_delivery.sql");
        String normalized = migration.replaceAll("\\s+", " ");

        assertTrue(normalized.contains("endpoint_hash BYTEA NOT NULL UNIQUE"));
        assertTrue(normalized.contains("notification_id BIGINT NOT NULL UNIQUE"));
        assertTrue(normalized.contains("UNIQUE (outbox_id, subscription_id)"));
        assertTrue(normalized.contains("FOREIGN KEY (notification_id)"));
        assertTrue(normalized.contains("FOREIGN KEY (outbox_id)"));
        assertTrue(normalized.contains("FOREIGN KEY (subscription_id)"));
    }

    @Test
    void claimsUseSingleStatementSkipLockedLeasesAndRetriesAreLeaseGuarded() throws Exception {
        Document mapper = readMapper(DELIVERY_RESOURCE);
        String outboxClaim = statement(mapper, "select", "claimOutboxes");
        String deliveryClaim = statement(mapper, "select", "claimDeliveries");
        String retry = statement(mapper, "update", "scheduleDeliveryRetry");

        assertClaim(outboxClaim);
        assertClaim(deliveryClaim);
        assertTrue(retry.contains("status = 'RETRY_WAIT'"));
        assertTrue(retry.contains("next_attempt_at = #{nextAttemptAt"));
        assertTrue(retry.contains("lease_token = #{leaseToken"));
        assertTrue(retry.contains("lease_until > CURRENT_TIMESTAMP"));
    }

    @Test
    void bothMappersParseAndExposeTheirStatementsForTheExistingMapperDiscoveryPattern()
            throws Exception {
        Resource[] discovered = new PathMatchingResourcePatternResolver()
                .getResources("classpath*:/egovframework/mapper/**/*_postgresql.xml");
        assertTrue(hasResource(discovered, "PushSubscription_SQL_postgresql.xml"));
        assertTrue(hasResource(discovered, "PushDelivery_SQL_postgresql.xml"));

        Configuration configuration = new Configuration();
        parseMapper(configuration, SUBSCRIPTION_RESOURCE);
        parseMapper(configuration, DELIVERY_RESOURCE);

        assertTrue(configuration.hasStatement("PushSubscriptionDAO.lockSubscriptionOwner"));
        assertTrue(configuration.hasStatement("PushSubscriptionDAO.upsertSubscription"));
        assertTrue(configuration.hasStatement("PushSubscriptionDAO.deactivateSubscription"));
        assertTrue(configuration.hasStatement("PushSubscriptionDAO.selectSubscription"));
        assertTrue(configuration.hasStatement("PushSubscriptionDAO.selectSubscriptionByEndpointHash"));
        assertTrue(configuration.hasStatement("PushDeliveryDAO.insertOutbox"));
        assertTrue(configuration.hasStatement("PushDeliveryDAO.claimOutboxes"));
        assertTrue(configuration.hasStatement("PushDeliveryDAO.claimDeliveries"));
        assertTrue(configuration.hasStatement("PushDeliveryDAO.scheduleDeliveryRetry"));
    }

    private static boolean hasResource(Resource[] resources, String fileName) throws Exception {
        for (Resource resource : resources) {
            if (fileName.equals(resource.getFilename())) {
                return true;
            }
        }
        return false;
    }

    private static void assertClaim(String statement) {
        String normalized = statement.replaceAll("\\s+", " ");
        assertTrue(normalized.startsWith("WITH candidates AS"));
        assertTrue(normalized.contains("FOR UPDATE SKIP LOCKED")
                || normalized.contains("FOR UPDATE OF delivery SKIP LOCKED"));
        int limitIndex = normalized.indexOf("LIMIT #{limit");
        int lockIndex = normalized.indexOf("FOR UPDATE");
        assertTrue(limitIndex >= 0 && lockIndex > limitIndex,
                "PostgreSQL LIMIT must precede the locking clause");
        assertTrue(normalized.contains("UPDATE public.tb_push_"));
        assertTrue(normalized.contains("lease_token = #{leaseToken"));
        assertTrue(normalized.contains("lease_until = #{leaseUntil"));
        assertTrue(normalized.contains("RETURNING"));
        assertTrue(!normalized.contains(";"));
    }

    private static void parseMapper(Configuration configuration, String resource) throws Exception {
        try (InputStream input = PushMapperXmlTest.class.getClassLoader().getResourceAsStream(resource)) {
            if (input == null) {
                throw new IllegalStateException("Push mapper XML not found: " + resource);
            }
            new XMLMapperBuilder(input, configuration, resource, configuration.getSqlFragments()).parse();
        }
    }

    private static Document readMapper(String resource) throws Exception {
        try (InputStream input = PushMapperXmlTest.class.getClassLoader().getResourceAsStream(resource)) {
            if (input == null) {
                throw new IllegalStateException("Push mapper XML not found: " + resource);
            }
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", false);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            return factory.newDocumentBuilder().parse(input);
        }
    }

    private static String statement(Document mapper, String tag, String id) {
        NodeList statements = mapper.getElementsByTagName(tag);
        for (int index = 0; index < statements.getLength(); index++) {
            Element element = (Element) statements.item(index);
            if (id.equals(element.getAttribute("id"))) {
                return element.getTextContent().replaceAll("\\s+", " ").trim();
            }
        }
        throw new AssertionError("mapper statement not found: " + id);
    }

    private static String readText(String resource) throws Exception {
        return new String(Files.readAllBytes(Paths.get(resource)), StandardCharsets.UTF_8);
    }
}
