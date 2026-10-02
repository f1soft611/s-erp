package egovframework.let.co.workflow.form.service.impl;

import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;

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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateSaveRequestVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateEmbeddedImageVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateVO;
import egovframework.let.co.workflow.form.domain.repository.DraftingWorkDAO;
import egovframework.let.co.workflow.form.service.DraftingWorkTemplateImageService;
import egovframework.com.common.domain.model.CommonFileVO;

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
            .addAttributes("img", "alt", "data-file-id", "height", "src", "title", "width")
            .addAttributes("td", "colspan", "rowspan")
            .addAttributes("th", "colspan", "rowspan");

    private final DraftingWorkDAO draftingWorkDAO;
    private final DraftingWorkTemplateImageService imageService;

    public DraftingWorkTemplateServiceImpl(
            DraftingWorkDAO draftingWorkDAO,
            DraftingWorkTemplateImageService imageService) {
        this.draftingWorkDAO = draftingWorkDAO;
        this.imageService = imageService;
    }

    public DraftingWorkTemplateVO getTemplate(Long tenantId, Long draftingWorkCategoryId) throws Exception {
        Map<String, Object> row = draftingWorkDAO.selectTemplate(tenantId, draftingWorkCategoryId);
        if (row == null) {
            throw new NoSuchElementException("기안양식을 찾을 수 없습니다.");
        }
        return toTemplate(row);
    }

    @Transactional(rollbackFor = Exception.class)
    public DraftingWorkTemplateVO saveTemplate(
            Long tenantId,
            Long draftingWorkCategoryId,
            DraftingWorkTemplateSaveRequestVO payload) throws Exception {
        return saveTemplate(tenantId, draftingWorkCategoryId, null, payload);
        }

    @Transactional(rollbackFor = Exception.class)
    public DraftingWorkTemplateVO saveTemplate(
            Long tenantId,
            Long draftingWorkCategoryId,
            String uploadedBy,
            DraftingWorkTemplateSaveRequestVO payload) throws Exception {
        if (payload == null || payload.getTemplateJson() == null
                || !payload.getTemplateJson().isObject()
                || !"doc".equals(payload.getTemplateJson().path("type").asText())
                || payload.getTemplateHtml() == null) {
            throw new IllegalArgumentException("템플릿 JSON과 HTML이 올바르게 입력되어야 합니다.");
        }

        draftingWorkDAO.lockTemplate(tenantId, draftingWorkCategoryId);
        Map<Long, CommonFileVO> ownedImages = indexOwnedImages(
            imageService.listTemplateImages(tenantId, draftingWorkCategoryId));
        JsonNode normalizedJson = sanitizeTemplateJson(payload.getTemplateJson(), draftingWorkCategoryId);
        Set<String> uploadTokens = collectUploadTokens(normalizedJson, payload.getTemplateHtml());
        Map<String, DraftingWorkTemplateEmbeddedImageVO> uploadMetadata = indexUploadMetadata(
            payload.getEmbeddedImages());
        Map<String, CommonFileVO> promotedImages = new HashMap<String, CommonFileVO>();
        for (String uploadToken : uploadTokens) {
            DraftingWorkTemplateEmbeddedImageVO image = uploadMetadata.get(uploadToken);
            if (image == null) {
            throw new IllegalArgumentException("본문 이미지 업로드 정보가 없습니다.");
            }
            promotedImages.put(uploadToken, imageService.promoteTemporaryImage(
                tenantId, draftingWorkCategoryId, uploadToken, image.getFileName(), uploadedBy));
        }

        Set<Long> retainedFileIds = new HashSet<Long>();
        JsonNode rewrittenJson = rewriteJsonImages(
            normalizedJson, draftingWorkCategoryId, ownedImages, promotedImages, retainedFileIds);
        String rewrittenHtml = rewriteHtmlImages(
            payload.getTemplateHtml(), draftingWorkCategoryId, ownedImages, promotedImages, retainedFileIds);
        JsonNode safeTemplateJson = sanitizeTemplateJson(rewrittenJson, draftingWorkCategoryId);
        String safeTemplateHtml = sanitizeTemplateHtml(rewrittenHtml, draftingWorkCategoryId);
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
        imageService.completeTemplateSave(
                tenantId, draftingWorkCategoryId, payload.getEmbeddedImages(), retainedFileIds);
        return toTemplate(saved);
    }

    private Map<Long, CommonFileVO> indexOwnedImages(List<CommonFileVO> images) {
        Map<Long, CommonFileVO> result = new HashMap<Long, CommonFileVO>();
        if (images == null) {
            return result;
        }
        for (CommonFileVO image : images) {
            if (image != null && image.getFileId() != null) {
                result.put(image.getFileId(), image);
            }
        }
        return result;
    }

    private Map<String, DraftingWorkTemplateEmbeddedImageVO> indexUploadMetadata(
            List<DraftingWorkTemplateEmbeddedImageVO> images) {
        Map<String, DraftingWorkTemplateEmbeddedImageVO> result =
                new HashMap<String, DraftingWorkTemplateEmbeddedImageVO>();
        if (images == null) {
            return result;
        }
        for (DraftingWorkTemplateEmbeddedImageVO image : images) {
            if (image == null || !StringUtils.hasText(image.getUploadToken())
                    || !StringUtils.hasText(image.getFileName())
                    || result.put(image.getUploadToken(), image) != null) {
                throw new IllegalArgumentException("본문 이미지 업로드 정보가 올바르지 않습니다.");
            }
        }
        return result;
    }

    private Set<String> collectUploadTokens(JsonNode document, String html) {
        Set<String> tokens = new HashSet<String>();
        collectJsonUploadTokens(document, tokens);
        org.jsoup.nodes.Document parsed = Jsoup.parseBodyFragment(html);
        for (Element image : parsed.body().select("img[data-upload-token]")) {
            String token = image.attr("data-upload-token");
            if (StringUtils.hasText(token)) {
                tokens.add(token);
            }
        }
        return tokens;
    }

    private void collectJsonUploadTokens(JsonNode node, Set<String> tokens) {
        if (node == null) {
            return;
        }
        if (node.isObject()) {
            if ("image".equals(node.path("type").asText())) {
                String token = node.path("attrs").path("data-upload-token").asText();
                if (StringUtils.hasText(token)) {
                    tokens.add(token);
                }
            }
            node.elements().forEachRemaining(child -> collectJsonUploadTokens(child, tokens));
        } else if (node.isArray()) {
            node.elements().forEachRemaining(child -> collectJsonUploadTokens(child, tokens));
        }
    }

    private JsonNode rewriteJsonImages(
            JsonNode document,
            Long draftingWorkCategoryId,
            Map<Long, CommonFileVO> ownedImages,
            Map<String, CommonFileVO> promotedImages,
            Set<Long> retainedFileIds) {
        ObjectNode rewritten = (ObjectNode) document.deepCopy();
        rewriteJsonImageNode(rewritten, draftingWorkCategoryId, ownedImages, promotedImages, retainedFileIds);
        return rewritten;
    }

    private void rewriteJsonImageNode(
            JsonNode node,
            Long draftingWorkCategoryId,
            Map<Long, CommonFileVO> ownedImages,
            Map<String, CommonFileVO> promotedImages,
            Set<Long> retainedFileIds) {
        if (node == null) {
            return;
        }
        if (node.isObject()) {
            ObjectNode object = (ObjectNode) node;
            if ("image".equals(object.path("type").asText())) {
                JsonNode rawAttributes = object.get("attrs");
                ObjectNode attributes = rawAttributes instanceof ObjectNode
                        ? (ObjectNode) rawAttributes
                        : object.putObject("attrs");
                String token = attributes.path("data-upload-token").asText();
                if (StringUtils.hasText(token)) {
                    CommonFileVO promoted = promotedImages.get(token);
                    if (promoted == null || promoted.getFileId() == null) {
                        throw new IllegalArgumentException("본문 이미지 업로드 정보가 올바르지 않습니다.");
                    }
                    setImageAttributes(attributes, draftingWorkCategoryId, promoted);
                    retainedFileIds.add(promoted.getFileId());
                } else {
                    Long fileId = resolveOwnedImageId(attributes.path("src").asText(),
                            attributes.path("data-file-id").asText(), draftingWorkCategoryId, ownedImages);
                    if (fileId != null) {
                        retainedFileIds.add(fileId);
                        attributes.put("src", imageUrl(draftingWorkCategoryId, fileId));
                        attributes.put("data-file-id", String.valueOf(fileId));
                    }
                }
                removeTransientImageAttributes(attributes);
            }
            java.util.Iterator<JsonNode> children = object.elements();
            while (children.hasNext()) {
                rewriteJsonImageNode(children.next(), draftingWorkCategoryId, ownedImages,
                        promotedImages, retainedFileIds);
            }
        } else if (node.isArray()) {
            java.util.Iterator<JsonNode> children = node.elements();
            while (children.hasNext()) {
                rewriteJsonImageNode(children.next(), draftingWorkCategoryId, ownedImages,
                        promotedImages, retainedFileIds);
            }
        }
    }

    private String rewriteHtmlImages(
            String html,
            Long draftingWorkCategoryId,
            Map<Long, CommonFileVO> ownedImages,
            Map<String, CommonFileVO> promotedImages,
            Set<Long> retainedFileIds) {
        Document document = Jsoup.parseBodyFragment(html);
        for (Element image : document.body().select("img")) {
            String token = image.attr("data-upload-token");
            if (StringUtils.hasText(token)) {
                CommonFileVO promoted = promotedImages.get(token);
                if (promoted == null || promoted.getFileId() == null) {
                    throw new IllegalArgumentException("본문 이미지 업로드 정보가 올바르지 않습니다.");
                }
                image.attr("src", imageUrl(draftingWorkCategoryId, promoted.getFileId()));
                image.attr("data-file-id", String.valueOf(promoted.getFileId()));
                retainedFileIds.add(promoted.getFileId());
            } else {
                Long fileId = resolveOwnedImageId(image.attr("src"), image.attr("data-file-id"),
                        draftingWorkCategoryId, ownedImages);
                if (fileId != null) {
                    image.attr("src", imageUrl(draftingWorkCategoryId, fileId));
                    image.attr("data-file-id", String.valueOf(fileId));
                    retainedFileIds.add(fileId);
                }
            }
            image.removeAttr("data-upload-token");
            image.removeAttr("data-upload-state");
            image.removeAttr("data-object-key");
            image.removeAttr("data-file-size");
            image.removeAttr("data-mime-type");
        }
        return document.body().html();
    }

    private Long resolveOwnedImageId(
            String source, String dataFileId, Long draftingWorkCategoryId, Map<Long, CommonFileVO> ownedImages) {
        Long sourceId = parseImageId(source, draftingWorkCategoryId);
        Long attributeId = null;
        if (StringUtils.hasText(dataFileId)) {
            try {
                attributeId = Long.valueOf(dataFileId);
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException("본문 이미지 소유 정보가 올바르지 않습니다.");
            }
        }
        if (sourceId != null && attributeId != null && !sourceId.equals(attributeId)) {
            throw new IllegalArgumentException("본문 이미지 소유 정보가 올바르지 않습니다.");
        }
        Long fileId = attributeId == null ? sourceId : attributeId;
        if (fileId != null && !ownedImages.containsKey(fileId)) {
            throw new IllegalArgumentException("현재 기안양식에 속한 본문 이미지가 아닙니다.");
        }
        return fileId;
    }

    private Long parseImageId(String source, Long draftingWorkCategoryId) {
        if (!StringUtils.hasText(source)) {
            return null;
        }
        String prefix = "/api/v1/co/workflow/forms/" + draftingWorkCategoryId + "/template-images/";
        if (!source.startsWith(prefix)) {
            if (source.startsWith("/api/v1/co/workflow/forms/")) {
                throw new IllegalArgumentException("다른 기안양식의 본문 이미지는 사용할 수 없습니다.");
            }
            return null;
        }
        String id = source.substring(prefix.length());
        if (!id.matches("[0-9]+")) {
            throw new IllegalArgumentException("본문 이미지 경로가 올바르지 않습니다.");
        }
        return Long.valueOf(id);
    }

    private void setImageAttributes(ObjectNode attributes, Long draftingWorkCategoryId, CommonFileVO image) {
        attributes.put("src", imageUrl(draftingWorkCategoryId, image.getFileId()));
        attributes.put("data-file-id", String.valueOf(image.getFileId()));
    }

    private void removeTransientImageAttributes(ObjectNode attributes) {
        attributes.remove("data-upload-token");
        attributes.remove("data-upload-state");
        attributes.remove("data-object-key");
        attributes.remove("data-file-size");
        attributes.remove("data-mime-type");
    }

    private String imageUrl(Long draftingWorkCategoryId, Long fileId) {
        return "/api/v1/co/workflow/forms/" + draftingWorkCategoryId + "/template-images/" + fileId;
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
        if (!(document instanceof ObjectNode) || !"doc".equals(document.path("type").asText())) {
            ObjectNode emptyDocument = OBJECT_MAPPER.createObjectNode();
            emptyDocument.put("type", "doc");
            emptyDocument.putArray("content");
            return emptyDocument;
        }
        JsonNode safeDocument = document.deepCopy();
        sanitizeJsonNode(safeDocument, draftingWorkCategoryId, null);
        return safeDocument;
    }

    private boolean sanitizeJsonNode(JsonNode node, Long draftingWorkCategoryId, String parentField) {
        if (!(node instanceof ObjectNode)) {
            return false;
        }
        ObjectNode object = (ObjectNode) node;
        String type = object.path("type").asText();
        boolean mark = "marks".equals(parentField);
        if (("content".equals(parentField) && !isSupportedNodeType(type))
                || (mark && !isSupportedMarkType(type))) {
            return false;
        }

        Iterator<Map.Entry<String, JsonNode>> fields = object.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            String name = field.getKey();
            String normalizedName = name.toLowerCase(java.util.Locale.ROOT);
            JsonNode value = field.getValue();
            if (normalizedName.equals("style") || normalizedName.startsWith("on")
                    || !(mark ? isAllowedMarkField(name) : isAllowedNodeField(name))) {
                fields.remove();
            } else if ("attrs".equals(name)) {
                if (!(value instanceof ObjectNode)) {
                    fields.remove();
                } else {
                    sanitizeJsonAttributes((ObjectNode) value, type, mark, draftingWorkCategoryId);
                }
            } else if ("content".equals(name) || "marks".equals(name)) {
                if (!(value instanceof ArrayNode)) {
                    fields.remove();
                } else {
                    sanitizeJsonArray((ArrayNode) value, draftingWorkCategoryId, name);
                }
            }
        }
        return true;
    }

    private void sanitizeJsonArray(ArrayNode array, Long draftingWorkCategoryId, String parentField) {
        for (int index = array.size() - 1; index >= 0; index--) {
            if (!sanitizeJsonNode(array.get(index), draftingWorkCategoryId, parentField)) {
                array.remove(index);
            }
        }
    }

    private void sanitizeJsonAttributes(
            ObjectNode attributes,
            String type,
            boolean mark,
            Long draftingWorkCategoryId) {
        Iterator<Map.Entry<String, JsonNode>> fields = attributes.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            String name = field.getKey();
            JsonNode value = field.getValue();
            if (!isAllowedAttribute(type, name, mark)
                    || name.equalsIgnoreCase("style")
                    || name.toLowerCase(java.util.Locale.ROOT).startsWith("on")) {
                fields.remove();
            } else if ("src".equalsIgnoreCase(name)
                    && (!value.isTextual()
                        || !isSafeTemplateImageUrl(value.asText(), draftingWorkCategoryId))) {
                fields.remove();
            } else if ("href".equalsIgnoreCase(name)
                    && (!value.isTextual() || !isSafeUrl(value.asText(), true))) {
                fields.remove();
            }
        }
    }

    private boolean isSupportedNodeType(String type) {
        return "doc".equals(type) || "paragraph".equals(type) || "text".equals(type)
                || "heading".equals(type) || "bulletList".equals(type) || "orderedList".equals(type)
                || "listItem".equals(type) || "blockquote".equals(type) || "codeBlock".equals(type)
                || "hardBreak".equals(type) || "horizontalRule".equals(type) || "table".equals(type)
                || "tableRow".equals(type) || "tableCell".equals(type) || "tableHeader".equals(type)
                || "image".equals(type);
    }

    private boolean isSupportedMarkType(String type) {
        return "bold".equals(type) || "italic".equals(type) || "strike".equals(type)
                || "link".equals(type) || "underline".equals(type) || "code".equals(type);
    }

    private boolean isAllowedNodeField(String name) {
        return "type".equals(name) || "attrs".equals(name) || "content".equals(name)
                || "text".equals(name) || "marks".equals(name);
    }

    private boolean isAllowedMarkField(String name) {
        return "type".equals(name) || "attrs".equals(name);
    }

    private boolean isAllowedAttribute(String type, String name, boolean mark) {
        if (mark) {
            return "link".equals(type)
                    && ("href".equals(name) || "target".equals(name) || "rel".equals(name)
                            || "class".equals(name) || "title".equals(name));
        }
        if ("heading".equals(type)) {
            return "level".equals(name);
        }
        if ("orderedList".equals(type)) {
            return "start".equals(name) || "type".equals(name);
        }
        if ("tableCell".equals(type) || "tableHeader".equals(type)) {
            return "colspan".equals(name) || "rowspan".equals(name) || "colwidth".equals(name);
        }
        if ("image".equals(type)) {
            return "src".equals(name) || "alt".equals(name) || "title".equals(name)
                    || "width".equals(name) || "height".equals(name)
                    || "data-upload-token".equals(name) || "data-upload-state".equals(name)
                    || "data-file-id".equals(name) || "data-object-key".equals(name)
                    || "data-file-size".equals(name) || "data-mime-type".equals(name);
        }
        return false;
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