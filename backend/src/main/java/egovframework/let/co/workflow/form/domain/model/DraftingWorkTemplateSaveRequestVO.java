package egovframework.let.co.workflow.form.domain.model;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DraftingWorkTemplateSaveRequestVO {

    private JsonNode templateJson;
    private String templateHtml;
}