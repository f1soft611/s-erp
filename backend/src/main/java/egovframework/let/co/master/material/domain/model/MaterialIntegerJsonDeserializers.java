package egovframework.let.co.master.material.domain.model;

import java.io.IOException;
import java.math.BigDecimal;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonMappingException;

public final class MaterialIntegerJsonDeserializers {
    private MaterialIntegerJsonDeserializers() {}

    private static BigDecimal decimal(JsonParser parser) throws IOException {
        if (!parser.currentToken().isNumeric()) {
            throw JsonMappingException.from(parser, "정수 필드는 JSON 숫자여야 합니다.");
        }
        return parser.getDecimalValue();
    }

    public static class LongValue extends JsonDeserializer<Long> {
        @Override
        public Long deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            try {
                return decimal(parser).longValueExact();
            } catch (ArithmeticException ex) {
                throw JsonMappingException.from(parser, "중량은 범위 내 정수여야 합니다.", ex);
            }
        }
    }

    public static class IntegerValue extends JsonDeserializer<Integer> {
        @Override
        public Integer deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            try {
                return decimal(parser).intValueExact();
            } catch (ArithmeticException ex) {
                throw JsonMappingException.from(parser, "소비기한계산숫자는 범위 내 정수여야 합니다.", ex);
            }
        }
    }
}
