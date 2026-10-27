package egovframework.let.co.master.classification.domain.model;

import java.io.IOException;
import java.math.BigInteger;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

public class ClassificationIdDeserializer extends JsonDeserializer<Long> {
    @Override
    public Long deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        if (parser.currentToken() == JsonToken.VALUE_NUMBER_INT) {
            BigInteger value = parser.getBigIntegerValue();
            if (value.signum() > 0 && value.compareTo(BigInteger.valueOf(9007199254740991L)) <= 0) {
                return value.longValue();
            }
        }
        return (Long) context.handleUnexpectedToken(Long.class, parser.currentToken(), parser,
                "분류 ID는 양의 안전한 정수여야 합니다.");
    }
}
