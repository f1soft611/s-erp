package egovframework.let.co.workflow.form.service.impl;

import java.net.URI;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.NoSuchElementException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateSaveRequestVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateVO;
import egovframework.let.co.workflow.form.domain.repository.DraftingWorkDAO;
import egovframework.let.co.workflow.form.service.DraftingWorkService;

@Service("draftingWorkTemplateService")
public class DraftingWorkTemplateServiceImpl {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Safelist TEMPLATE_HTML_SAFELIST = Safelist.none()
            .addTags("a", "blockquote", "br", "caption", "code", "col", "colgroup", "dd", "div", "dl",
                    "dt", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "li", "ol", "p",
                    "img", "pre", "s", "span", "strong", "sub", "sup", "table", "tbody", "td", "th", "thead",
                    "tfoot", "tr", "u", "ul")
            .addAttributes("a", "href", "title")
            .addProtocols("a", "href", "http", "https", "mailto")
            .addAttributes("img", "alt", "height", "src", "title", "width")
            .addAttributes("td", "colspan", "rowspan")
            .addAttributes("th", "colspan", "rowspan");

    private final DraftingWorkDAO draftingWorkDAO;

    public DraftingWorkTemplateServiceImpl(DraftingWorkDAO draftingWorkDAO) {
        this.draftingWorkDAO = draftingWorkDAO;
    }

    public DraftingWorkTemplateVO getTemplate(Long tenantId, Long draftingWorkCategoryId) throws Exception {
        Map<String, Object> row = draftingWorkDAO.selectTemplate(tenantId, draftingWorkCategoryId);
        if (row == null) {
            throw new NoSuchElementException("기안양식을 찾을 수 없습니다.");
        }
        return toTemplate(row);
    }

    public DraftingWorkTemplateVO saveTemplate(
            Long tenantId,
            Long draftingWorkCategoryId,
            DraftingWorkTemplateSaveRequestVO payload) throws Exception {
        if (payload == null || payload.getTemplateJson() == null
                || !payload.getTemplateJson().isObject()
                || !"doc".equals(payload.getTemplateJson().path("type").asText())
                || payload.getTemplateHtml() == null) {
            throw new IllegalArgumentException("템플릿 JSON과 HTML이 올바르게 입력되어야 합니다.");
        }

        JsonNode safeTemplateJson = sanitizeTemplateJson(payload.getTemplateJson(), draftingWorkCategoryId);
        String safeTemplateHtml = sanitizeTemplateHtml(payload.getTemplateHtml(), draftingWorkCategoryId);
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("workId", draftingWorkCategoryId);
        params.put("templateJson", OBJECT_MAPPER.writeValueAsString(safeTemplateJson));
        params.put("templateHtml", safeTemplateHtml);
        if (draftingWorkDAO.updateTemplate(params) == 0) {
            throw new NoSuchElementException("기안양식을 찾을 수 없습니다.");
        }

        Map<String, Object> saved = draftingWorkDAO.selectTemplate(tenantId, draftingWorkCategoryId);
        if (saved == null) {
            throw new NoSuchElementException("기안양식을 찾을 수 없습니다.");
        }
        return toTemplate(saved);
    }

    private DraftingWorkTemplateVO toTemplate(Map<String, Object> row) throws Exception {
        DraftingWorkTemplateVO template = new DraftingWorkTemplateVO();
        template.setDraftingWorkCategoryId(asLong(row.get("draftingWorkCategoryId")));
        template.setCataTypeCode(asString(row.get("cataTypeCode")));
        template.setCodeName(asString(row.get("codeName")));
        template.setTemplateHtml(asString(row.get("templateHtml")));
        Object jsonValue = row.get("templateJson");
        if (jsonValue != null && StringUtils.hasText(jsonValue.toString())) {
            template.setTemplateJson(sanitizeTemplateJson(
                    OBJECT_MAPPER.readTree(jsonValue.toString()), template.getDraftingWorkCategoryId()));
        }
        template.setTemplateHtml(template.getTemplateHtml() == null
                ? null
                : sanitizeTemplateHtml(template.getTemplateHtml(), template.getDraftingWorkCategoryId()));
        Object hasDocument = row.get("hasDocument");
        template.setHasDocument(hasDocument == null
                ? template.getTemplateJson() != null || StringUtils.hasText(template.getTemplateHtml())
                : Boolean.valueOf(hasDocument.toString()));
        return template;
    }

    private JsonNode sanitizeTemplateJson(JsonNode document, Long draftingWorkCategoryId) {
        JsonNode safeDocument = document.deepCopy();
        sanitizeJsonNode(safeDocument, draftingWorkCategoryId, false);
        return safeDocument;
    }

    private void sanitizeJsonNode(JsonNode node, Long draftingWorkCategoryId, boolean imageAttributes) {
        if (node instanceof ObjectNode) {
            ObjectNode object = (ObjectNode) node;
            boolean imageNode = "image".equals(object.path("type").asText());
            Iterator<Map.Entry<String, JsonNode>> fields = object.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                String name = field.getKey();
                String normalizedName = name.toLowerCase(java.util.Locale.ROOT);
                JsonNode value = field.getValue();
                if (normalizedName.equals("style") || normalizedName.startsWith("on")) {
                    fields.remove();
                } else if (normalizedName.equals("src")
                        && (!imageAttributes || !value.isTextual()
                                || !isSafeTemplateImageUrl(value.asText(), draftingWorkCategoryId))) {
                    fields.remove();
                } else if (normalizedName.equals("href")
                        && (!value.isTextual() || !isSafeUrl(value.asText(), true))) {
                    fields.remove();
                } else {
                    sanitizeJsonNode(value, draftingWorkCategoryId, imageNode && normalizedName.equals("attrs"));
                }
            }
        } else if (node instanceof ArrayNode) {
            for (JsonNode child : (ArrayNode) node) {
                sanitizeJsonNode(child, draftingWorkCategoryId, false);
            }
        }
    }

    private String sanitizeTemplateHtml(String html, Long draftingWorkCategoryId) {
        Document document = Jsoup.parseBodyFragment(Jsoup.clean(html, TEMPLATE_HTML_SAFELIST));
        for (Element image : document.body().select("img")) {
            if (!isSafeTemplateImageUrl(image.attr("src"), draftingWorkCategoryId)) {
                image.remove();
                continue;
            }
            sanitizeImageDimension(image, "width");
            sanitizeImageDimension(image, "height");
        }
        return document.body().html();
    }

    private void sanitizeImageDimension(Element image, String attribute) {
        String value = image.attr(attribute);
        if (StringUtils.hasText(value) && !value.matches("[0-9]{1,5}")) {
            image.removeAttr(attribute);
        }
    }

    private boolean isSafeTemplateImageUrl(String value, Long draftingWorkCategoryId) {
        if (!StringUtils.hasText(value) || draftingWorkCategoryId == null) {
            return false;
        }
        String prefix = "/api/v1/co/workflow/forms/" + draftingWorkCategoryId + "/template-images/";
        return value.startsWith(prefix) && value.substring(prefix.length()).matches("[0-9]+");
    }

    private boolean isSafeUrl(String value, boolean allowMailto) {
        if (!StringUtils.hasText(value) || value.startsWith("//") || value.indexOf('\\') >= 0) {
            return false;
        }
        try {
            String scheme = URI.create(value.trim()).getScheme();
            return scheme == null || "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)
                    || (allowMailto && "mailto".equalsIgnoreCase(scheme));
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private Long asLong(Object value) {
        return value == null ? null : Long.valueOf(value.toString());
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }
}