package egovframework.let.co.master.customer.domain.model;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.core.converter.ResolvedSchema;

class CustomerInfoSchemaTest {

    static Stream<Class<?>> models() {
        return Stream.of(
                CustomerInfoVO.class, CustomerInfoSaveRequestVO.class,
                CustomerInfoSearchCondition.class, CustomerInfoChangeVO.class,
                CustomerInfoBatchChangeSetVO.class, CustomerInfoBatchSaveRequestVO.class,
                CustomerInfoBatchSaveResultVO.class);
    }

    @ParameterizedTest
    @MethodSource("models")
    void everyModelAndBusinessFieldHasSchemaDescription(Class<?> model) {
        assertDescription(model.getAnnotation(Schema.class), model.getSimpleName());
        for (Class<?> current = model; current != Object.class; current = current.getSuperclass()) {
            for (Field field : current.getDeclaredFields()) {
                if (!Modifier.isStatic(field.getModifiers()) && !field.isSynthetic()) {
                    assertDescription(field.getAnnotation(Schema.class),
                            current.getSimpleName() + "." + field.getName());
                }
            }
        }
    }

    @Test
    void generatedOpenApiIncludesNestedAndInheritedCustomerFields() {
        ResolvedSchema request = ModelConverters.getInstance().resolveAsResolvedSchema(
                new AnnotatedType(CustomerInfoBatchSaveRequestVO.class));
        assertNotNull(request.referencedSchemas.get("CustomerInfoBatchChangeSetVO"));
        assertNotNull(request.referencedSchemas.get("CustomerInfoChangeVO"));
        assertTrue(request.referencedSchemas.get("CustomerInfoChangeVO")
                .getProperties().containsKey("customerCode"));
        assertTrue(request.referencedSchemas.get("CustomerInfoChangeVO")
                .getProperties().containsKey("customerId"));
        assertTrue(request.referencedSchemas.get("CustomerInfoChangeVO")
                .getRequired().contains("customerName"));

        ResolvedSchema response = ModelConverters.getInstance().resolveAsResolvedSchema(
                new AnnotatedType(CustomerInfoBatchSaveResultVO.class));
        assertNotNull(response.referencedSchemas.get("CustomerInfoVO"));
        assertTrue(response.referencedSchemas.get("CustomerInfoVO")
                .getProperties().containsKey("updatedAt"));
    }

    @Test
    void generatedOpenApiDocumentsClassificationWithoutInternalPresenceFlags() {
        ResolvedSchema response = ModelConverters.getInstance().resolveAsResolvedSchema(
                new AnnotatedType(CustomerInfoVO.class));
        io.swagger.v3.oas.models.media.Schema<?> responseSchema = response.schema;
        for (String field : new String[] {
                "businessKind1", "businessKind2", "businessKind1Name", "businessKind2Name" }) {
            io.swagger.v3.oas.models.media.Schema<?> property = responseSchema.getProperties().get(field);
            assertNotNull(property, field);
            assertNotNull(property.getDescription(), field);
            assertFalse(property.getDescription().trim().isEmpty(), field);
        }
        for (Class<?> model : new Class<?>[] {
                CustomerInfoSaveRequestVO.class, CustomerInfoChangeVO.class }) {
            ResolvedSchema request = ModelConverters.getInstance().resolveAsResolvedSchema(
                    new AnnotatedType(model));
            assertTrue(request.schema.getProperties().containsKey("businessKind1"));
            assertTrue(request.schema.getProperties().containsKey("businessKind2"));
            assertFalse(request.schema.getProperties().containsKey("businessKind1Provided"));
            assertFalse(request.schema.getProperties().containsKey("businessKind2Provided"));
        }
    }

    @Test
    void documentsRequiredNameAndUseStatusContract() throws Exception {
        Schema name = CustomerInfoSaveRequestVO.class.getDeclaredField("customerName")
                .getAnnotation(Schema.class);
        assertNotNull(name);
        assertTrue(name.required());
        for (Class<?> model : new Class<?>[] {
                CustomerInfoVO.class, CustomerInfoSaveRequestVO.class, CustomerInfoSearchCondition.class }) {
            Schema useAt = model.getDeclaredField("useAt").getAnnotation(Schema.class);
            assertNotNull(useAt);
            assertArrayEquals(new String[] { "Y", "N" }, useAt.allowableValues());
        }
    }

    private void assertDescription(Schema schema, String target) {
        assertNotNull(schema, target);
        assertFalse(schema.description().trim().isEmpty(), target);
    }
}
