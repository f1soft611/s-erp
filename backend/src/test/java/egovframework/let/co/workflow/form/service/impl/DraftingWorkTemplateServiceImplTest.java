package egovframework.let.co.workflow.form.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.lang.reflect.Constructor;
import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.SqlCommandType;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.stereotype.Service;

import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateSaveRequestVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateVO;
import egovframework.let.co.workflow.form.domain.repository.DraftingWorkDAO;
import egovframework.let.co.workflow.form.service.impl.DraftingWorkTemplateServiceImpl;
import egovframework.let.co.master.commoncode.service.CommonCodeGroupService;
import egovframework.let.co.master.commoncode.service.CommonCodeItemService;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

@ExtendWith(MockitoExtension.class)
class DraftingWorkTemplateServiceImplTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Mock
    private DraftingWorkDAO draftingWorkDAO;

    @Mock
    private EgovIdGnrService codeIdGnrService;

    @Mock
    private CommonCodeGroupService commonCodeGroupService;

    @Mock
    private CommonCodeItemService commonCodeItemService;

    private DraftingWorkServiceImpl draftingWorkTemplateService;

    @BeforeEach
    void setUp() {
        draftingWorkTemplateService = new DraftingWorkServiceImpl(
                draftingWorkDAO, codeIdGnrService, commonCodeGroupService, commonCodeItemService,
                new DraftingWorkTemplateServiceImpl(draftingWorkDAO));
    }

    @Test
    void getTemplateUsesTenantScopedRowAndRestoresJsonbAndHtml() throws Exception {
        when(draftingWorkDAO.selectTemplate(9L, 77L)).thenReturn(templateRow(
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\"}]}", "<p>저장 본문</p>"));

        DraftingWorkTemplateVO result = draftingWorkTemplateService.getTemplate(9L, 77L);

        assertEquals(77L, result.getDraftingWorkCategoryId());
        assertEquals("doc", result.getTemplateJson().path("type").asText());
        assertEquals("paragraph", result.getTemplateJson().path("content").get(0).path("type").asText());
        assertEquals("<p>저장 본문</p>", result.getTemplateHtml());
        verify(draftingWorkDAO).selectTemplate(9L, 77L);
    }

    @Test
    void getTemplateSanitizesStoredHtmlAndUnsafeJsonAttributes() throws Exception {
        when(draftingWorkDAO.selectTemplate(9L, 77L)).thenReturn(templateRow(
                "{\"type\":\"doc\",\"content\":[{\"type\":\"image\",\"attrs\":{"
                        + "\"src\":\"javascript:alert(1)\",\"onerror\":\"alert(2)\",\"alt\":\"x\"}}]}",
                "<p onclick=\"alert(1)\">안전</p><script>alert(2)</script>"));

        DraftingWorkTemplateVO result = draftingWorkTemplateService.getTemplate(9L, 77L);

        JsonNode imageAttributes = result.getTemplateJson().path("content").get(0).path("attrs");
        assertTrue(imageAttributes.path("src").isMissingNode());
        assertTrue(imageAttributes.path("onerror").isMissingNode());
        assertEquals("<p>안전</p>", result.getTemplateHtml());
    }

    @Test
    void getTemplateRemovesNonTextAndUnsafeHrefValuesAndRetainsSafeLinks() throws Exception {
        when(draftingWorkDAO.selectTemplate(9L, 77L)).thenReturn(templateRow(
                "{\"type\":\"doc\",\"content\":["
                        + "{\"type\":\"text\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":[\"https://safe.example\"]}}]},"
                        + "{\"type\":\"text\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":{\"url\":\"https://safe.example\"}}}]},"
                        + "{\"type\":\"text\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"javascript:alert(1)\"}}]},"
                        + "{\"type\":\"text\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://safe.example/path\"}}]}]}",
                "<p>본문</p>"));

        DraftingWorkTemplateVO result = draftingWorkTemplateService.getTemplate(9L, 77L);

        JsonNode content = result.getTemplateJson().path("content");
        assertTrue(content.get(0).path("marks").get(0).path("attrs").path("href").isMissingNode());
        assertTrue(content.get(1).path("marks").get(0).path("attrs").path("href").isMissingNode());
        assertTrue(content.get(2).path("marks").get(0).path("attrs").path("href").isMissingNode());
        assertEquals("https://safe.example/path",
                content.get(3).path("marks").get(0).path("attrs").path("href").asText());
    }

    @Test
    void getTemplateOnlyRetainsImageSourcesForTheCurrentForm() throws Exception {
        when(draftingWorkDAO.selectTemplate(9L, 77L)).thenReturn(templateRow(
                "{\"type\":\"doc\",\"content\":["
                        + "{\"type\":\"image\",\"attrs\":{\"src\":\"https://remote.example/image.png\"}},"
                        + "{\"type\":\"image\",\"attrs\":{\"src\":\"//remote.example/image.png\"}},"
                        + "{\"type\":\"image\",\"attrs\":{\"src\":\"/api/v1/co/workflow/forms/78/template-images/12\"}},"
                        + "{\"type\":\"image\",\"attrs\":{\"src\":\"/api/v1/co/workflow/forms/77/template-images/12\"}}]}",
                "<p>본문</p>"));

        DraftingWorkTemplateVO result = draftingWorkTemplateService.getTemplate(9L, 77L);

        JsonNode images = result.getTemplateJson().path("content");
        assertTrue(images.get(0).path("attrs").path("src").isMissingNode());
        assertTrue(images.get(1).path("attrs").path("src").isMissingNode());
        assertTrue(images.get(2).path("attrs").path("src").isMissingNode());
        assertEquals("/api/v1/co/workflow/forms/77/template-images/12",
                images.get(3).path("attrs").path("src").asText());
    }

    @Test
    void getTemplateRemovesUnsupportedJsonNodesAndMarks() throws Exception {
        when(draftingWorkDAO.selectTemplate(9L, 77L)).thenReturn(templateRow(
            "{\"type\":\"doc\",\"content\":["
                + "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"keep\","
                + "\"marks\":[{\"type\":\"bold\"},{\"type\":\"fontFamily\",\"attrs\":{\"font\":\"bad\"}}]}]},"
                + "{\"type\":\"iframe\",\"attrs\":{\"src\":\"https://evil.example\"},"
                + "\"content\":[{\"type\":\"text\",\"text\":\"remove\"}]}]}",
            "<p>본문</p>"));

        DraftingWorkTemplateVO result = draftingWorkTemplateService.getTemplate(9L, 77L);

        JsonNode content = result.getTemplateJson().path("content");
        assertEquals(1, content.size());
        assertEquals("paragraph", content.get(0).path("type").asText());
        JsonNode marks = content.get(0).path("content").get(0).path("marks");
        assertEquals(1, marks.size());
        assertEquals("bold", marks.get(0).path("type").asText());
    }

    @Test
    void getTemplateRetainsSupportedTiptapNodesMarksAndSchemaAttributes() throws Exception {
        String templateJson = "{\"type\":\"doc\",\"content\":["
            + "{\"type\":\"paragraph\",\"content\":["
            + "{\"type\":\"text\",\"text\":\"bold\",\"marks\":[{\"type\":\"bold\"}]},"
            + "{\"type\":\"text\",\"text\":\"italic\",\"marks\":[{\"type\":\"italic\"}]},"
            + "{\"type\":\"text\",\"text\":\"strike\",\"marks\":[{\"type\":\"strike\"}]},"
            + "{\"type\":\"text\",\"text\":\"link\",\"marks\":[{\"type\":\"link\","
            + "\"attrs\":{\"href\":\"https://safe.example/path\"}}]},"
            + "{\"type\":\"text\",\"text\":\"underline\",\"marks\":[{\"type\":\"underline\"}]},"
            + "{\"type\":\"text\",\"text\":\"code\",\"marks\":[{\"type\":\"code\"}]}]},"
            + "{\"type\":\"heading\",\"attrs\":{\"level\":3,\"unknown\":\"remove\"},"
            + "\"content\":[{\"type\":\"text\",\"text\":\"title\"}]},"
            + "{\"type\":\"bulletList\",\"content\":[{\"type\":\"listItem\","
            + "\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"bullet\"}]}]}]},"
            + "{\"type\":\"orderedList\",\"attrs\":{\"start\":4},\"content\":[{\"type\":\"listItem\","
            + "\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"ordered\"}]}]}]},"
            + "{\"type\":\"blockquote\",\"content\":[{\"type\":\"paragraph\",\"content\":["
            + "{\"type\":\"text\",\"text\":\"quote\"}]}]},"
            + "{\"type\":\"table\",\"content\":[{\"type\":\"tableRow\",\"content\":["
            + "{\"type\":\"tableHeader\",\"attrs\":{\"colspan\":2,\"rowspan\":3},"
            + "\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"head\"}]}]},"
            + "{\"type\":\"tableCell\",\"attrs\":{\"colspan\":3,\"rowspan\":2},"
            + "\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"cell\"}]}]}]}]},"
            + "{\"type\":\"image\",\"attrs\":{\"src\":\"/api/v1/co/workflow/forms/77/template-images/12\","
            + "\"alt\":\"inspection chart\",\"width\":640,\"height\":360}}]}";
        when(draftingWorkDAO.selectTemplate(9L, 77L)).thenReturn(templateRow(templateJson, "<p>본문</p>"));

        DraftingWorkTemplateVO result = draftingWorkTemplateService.getTemplate(9L, 77L);

        JsonNode document = result.getTemplateJson();
        JsonNode content = document.path("content");
        assertEquals("doc", document.path("type").asText());
        assertEquals("paragraph", content.get(0).path("type").asText());
        assertEquals("text", content.get(0).path("content").get(0).path("type").asText());
        assertEquals(6, content.get(0).path("content").size());
        assertEquals("bold", content.get(0).path("content").get(0).path("marks").get(0).path("type").asText());
        assertEquals("italic", content.get(0).path("content").get(1).path("marks").get(0).path("type").asText());
        assertEquals("strike", content.get(0).path("content").get(2).path("marks").get(0).path("type").asText());
        assertEquals("https://safe.example/path", content.get(0).path("content").get(3)
            .path("marks").get(0).path("attrs").path("href").asText());
        assertEquals("underline", content.get(0).path("content").get(4).path("marks").get(0).path("type").asText());
        assertEquals("code", content.get(0).path("content").get(5).path("marks").get(0).path("type").asText());
        assertEquals(3, content.get(1).path("attrs").path("level").asInt());
        assertTrue(content.get(1).path("attrs").path("unknown").isMissingNode());
        assertEquals("bulletList", content.get(2).path("type").asText());
        assertEquals("orderedList", content.get(3).path("type").asText());
        assertEquals(4, content.get(3).path("attrs").path("start").asInt());
        assertEquals("blockquote", content.get(4).path("type").asText());
        assertEquals("table", content.get(5).path("type").asText());
        assertEquals("tableRow", content.get(5).path("content").get(0).path("type").asText());
        assertEquals(2, content.get(5).path("content").get(0).path("content").get(0)
            .path("attrs").path("colspan").asInt());
        assertEquals(3, content.get(5).path("content").get(0).path("content").get(0)
            .path("attrs").path("rowspan").asInt());
        assertEquals("tableCell", content.get(5).path("content").get(0).path("content").get(1).path("type").asText());
        assertEquals(3, content.get(5).path("content").get(0).path("content").get(1)
            .path("attrs").path("colspan").asInt());
        assertEquals(2, content.get(5).path("content").get(0).path("content").get(1)
            .path("attrs").path("rowspan").asInt());
        JsonNode imageAttributes = content.get(6).path("attrs");
        assertEquals("/api/v1/co/workflow/forms/77/template-images/12", imageAttributes.path("src").asText());
        assertEquals("inspection chart", imageAttributes.path("alt").asText());
        assertEquals(640, imageAttributes.path("width").asInt());
        assertEquals(360, imageAttributes.path("height").asInt());
    }

    @Test
    void getTemplateRetainsOnlySameFormImagesInHtml() throws Exception {
        when(draftingWorkDAO.selectTemplate(9L, 77L)).thenReturn(templateRow(
                "{\"type\":\"doc\",\"content\":[]}",
                "<img src=\"/api/v1/co/workflow/forms/77/template-images/12\" alt=\"safe\" "
                        + "title=\"title\" width=\"320\" height=\"180\" onclick=\"alert(1)\">"
                        + "<img src=\"https://remote.example/image.png\" alt=\"remote\">"
                        + "<img src=\"/api/v1/co/workflow/forms/78/template-images/12\" alt=\"other\">"));

        DraftingWorkTemplateVO result = draftingWorkTemplateService.getTemplate(9L, 77L);

        assertTrue(result.getTemplateHtml().contains("src=\"/api/v1/co/workflow/forms/77/template-images/12\""));
        assertTrue(result.getTemplateHtml().contains("alt=\"safe\""));
        assertTrue(result.getTemplateHtml().contains("title=\"title\""));
        assertTrue(result.getTemplateHtml().contains("width=\"320\""));
        assertTrue(result.getTemplateHtml().contains("height=\"180\""));
        assertFalse(result.getTemplateHtml().contains("onclick"));
        assertFalse(result.getTemplateHtml().contains("remote.example"));
        assertFalse(result.getTemplateHtml().contains("forms/78/"));
    }

    @Test
    void templateServiceIsSpringManagedAndInjectedByConstructor() {
        assertTrue(DraftingWorkTemplateServiceImpl.class.isAnnotationPresent(Service.class));

        boolean acceptsTemplateService = false;
        for (Constructor<?> constructor : DraftingWorkServiceImpl.class.getConstructors()) {
            for (Class<?> parameterType : constructor.getParameterTypes()) {
                if (parameterType == DraftingWorkTemplateServiceImpl.class) {
                    acceptsTemplateService = true;
                }
            }
        }
        assertTrue(acceptsTemplateService);
    }

    @Test
    void saveTemplateSanitizesHtmlAndRoundTripsJsonThroughTenantScopedColumns() throws Exception {
        JsonNode document = OBJECT_MAPPER.readTree(
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\","
                        + "\"content\":[{\"type\":\"text\",\"text\":\"안전한 본문\"}]}]}");
        DraftingWorkTemplateSaveRequestVO request = new DraftingWorkTemplateSaveRequestVO();
        request.setTemplateJson(document);
        request.setTemplateHtml("<p onclick=\"alert(1)\">안전한 본문</p><script>alert(2)</script>");
        when(draftingWorkDAO.updateTemplate(any())).thenReturn(1);
        when(draftingWorkDAO.selectTemplate(9L, 77L)).thenReturn(templateRow(
                document.toString(), "<p>안전한 본문</p>"));

        DraftingWorkTemplateVO result = draftingWorkTemplateService.saveTemplate(9L, 77L, request);

        assertEquals(document, result.getTemplateJson());
        assertEquals("<p>안전한 본문</p>", result.getTemplateHtml());
        verify(draftingWorkDAO).updateTemplate(argThat(params ->
                Long.valueOf(9L).equals(params.get("tenantId"))
                        && Long.valueOf(77L).equals(params.get("workId"))
                        && document.toString().equals(params.get("templateJson"))
                        && params.get("templateHtml").toString().contains("안전한 본문")
                        && !params.get("templateHtml").toString().contains("onclick")
                        && !params.get("templateHtml").toString().contains("<script")));
        assertFalse(result.getTemplateHtml().contains("onclick"));
        assertFalse(result.getTemplateHtml().contains("<script"));
    }

    @Test
    void saveTemplateRejectsNonDocumentJsonBeforeDatabaseWrite() throws Exception {
        DraftingWorkTemplateSaveRequestVO request = new DraftingWorkTemplateSaveRequestVO();
        request.setTemplateJson(OBJECT_MAPPER.readTree("{\"type\":\"paragraph\"}"));
        request.setTemplateHtml("<p>본문</p>");

        assertThrows(IllegalArgumentException.class,
                () -> draftingWorkTemplateService.saveTemplate(9L, 77L, request));

        verify(draftingWorkDAO, never()).updateTemplate(any());
    }

    @Test
    void getTemplateThrowsNotFoundForMissingTenantForm() throws Exception {
        when(draftingWorkDAO.selectTemplate(9L, 77L)).thenReturn(null);

        assertThrows(NoSuchElementException.class,
                () -> draftingWorkTemplateService.getTemplate(9L, 77L));

        verify(draftingWorkDAO).selectTemplate(9L, 77L);
    }

    @Test
    void saveTemplateThrowsNotFoundWhenTenantScopedUpdateMatchesNoForm() throws Exception {
        DraftingWorkTemplateSaveRequestVO request = validRequest();
        when(draftingWorkDAO.updateTemplate(any())).thenReturn(0);

        assertThrows(NoSuchElementException.class,
                () -> draftingWorkTemplateService.saveTemplate(9L, 77L, request));
    }

            @Test
            void templateMapperUsesTenantScopedExistingJsonbAndHtmlColumns() throws Exception {
            String resource = "egovframework/mapper/let/co/workflow/form/DraftingWork_SQL_postgresql.xml";
            Configuration configuration = new Configuration();
            try (InputStream mapperStream = getClass().getClassLoader().getResourceAsStream(resource)) {
                new XMLMapperBuilder(mapperStream, configuration, resource, configuration.getSqlFragments()).parse();
            }

            assertEquals(SqlCommandType.SELECT,
                configuration.getMappedStatement("DraftingWorkDAO.selectTemplate").getSqlCommandType());
            Map<String, Object> params = new HashMap<String, Object>();
            params.put("tenantId", 9L);
            params.put("workId", 77L);
            String selectSql = configuration.getMappedStatement("DraftingWorkDAO.selectTemplate")
                .getBoundSql(params).getSql().toLowerCase().replaceAll("\\s+", " ");
            assertTrue(selectSql.contains("drafting_work_template_json::text"));
            assertTrue(selectSql.contains("drafting_work_template_html"));
            assertTrue(selectSql.contains("where tenant_id = ?"));
            assertTrue(selectSql.contains("drafting_work_category_id = ?"));
            assertFalse(selectSql.contains("drafting_work_template_text"));

            assertEquals(SqlCommandType.UPDATE,
                configuration.getMappedStatement("DraftingWorkDAO.updateTemplate").getSqlCommandType());
            params.put("templateJson", "{\"type\":\"doc\",\"content\":[]}");
            params.put("templateHtml", "<p>본문</p>");
            String updateSql = configuration.getMappedStatement("DraftingWorkDAO.updateTemplate")
                .getBoundSql(params).getSql().toLowerCase().replaceAll("\\s+", " ");
            assertTrue(updateSql.contains("drafting_work_template_json = cast(? as jsonb)"));
            assertTrue(updateSql.contains("drafting_work_template_html = ?"));
            assertTrue(updateSql.contains("where tenant_id = ?"));
            assertTrue(updateSql.contains("drafting_work_category_id = ?"));
            assertFalse(updateSql.contains("drafting_work_template_text"));
            }

    private DraftingWorkTemplateSaveRequestVO validRequest() throws Exception {
        DraftingWorkTemplateSaveRequestVO request = new DraftingWorkTemplateSaveRequestVO();
        request.setTemplateJson(OBJECT_MAPPER.readTree("{\"type\":\"doc\",\"content\":[]}"));
        request.setTemplateHtml("<p>본문</p>");
        return request;
    }

    private Map<String, Object> templateRow(String templateJson, String templateHtml) {
        Map<String, Object> row = new HashMap<String, Object>();
        row.put("draftingWorkCategoryId", 77L);
        row.put("cataTypeCode", "007");
        row.put("codeName", "정기점검");
        row.put("templateJson", templateJson);
        row.put("templateHtml", templateHtml);
        row.put("hasDocument", true);
        return row;
    }
}