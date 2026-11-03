package egovframework.com.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.charset.StandardCharsets;
import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.MockHttpOutputMessage;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;

import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.com.security.WebMvcConfig;
import egovframework.let.groupware.message.domain.model.DirectMessageVO;

class HtmlCharacterEscapesTest {
    @Test
    void preservesEmojiInMessageListUtf8Response() throws Exception {
        String text = "\ud83d\ude00 \ud83d\udc4d\ud83c\udffd \ud83d\udc69\u200d\ud83d\udcbb 한글 \" <>&\n";
        DirectMessageVO message = new DirectMessageVO();
        message.setLatestContent(text);
        MappingJackson2HttpMessageConverter converter = (MappingJackson2HttpMessageConverter)
                new WebMvcConfig(new ObjectMapper()).htmlEscapingConverter();
        MockHttpOutputMessage response = new MockHttpOutputMessage();
        converter.write(Collections.singletonMap("resultList", Collections.singletonList(message)),
                MediaType.APPLICATION_JSON, response);
        assertEquals(text, new ObjectMapper().readTree(response.getBodyAsString(StandardCharsets.UTF_8))
                .get("resultList").get(0).get("latestContent").asText());
    }
}
