package egovframework.let.co.master.material.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.*;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.material.domain.model.*;
import egovframework.let.co.master.material.service.*;

class MaterialInfoApiControllerTest {
    private final MaterialInfoService materials = mock(MaterialInfoService.class);
    private final MaterialInfoBatchService batch = mock(MaterialInfoBatchService.class);
    private MockMvc mvc;
    @BeforeEach void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new MaterialInfoApiController(new ResultVoHelper(), batch, materials))
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    public boolean supportsParameter(MethodParameter p) {
                        return p.hasParameterAnnotation(AuthenticationPrincipal.class);
                    }
                    public Object resolveArgument(MethodParameter p, ModelAndViewContainer c, NativeWebRequest r,
                            org.springframework.web.bind.support.WebDataBinderFactory b) {
                        return ((UsernamePasswordAuthenticationToken) r.getUserPrincipal()).getPrincipal();
                    }
                }).build();
    }
    private UsernamePasswordAuthenticationToken user(String role) {
        LoginVO user = new LoginVO();
        user.setTenantId(9L);
        user.setUniqId("00101");
        user.setRoleCode(role);
        return new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList());
    }
    @Test void listUsesPrincipalTenantNotQueryTenant() throws Exception {
        when(materials.listMaterials(eq(9L), any())).thenReturn(Collections.emptyList());
        mvc.perform(get("/api/v1/co/master/materials").param("tenantId", "888")
                .param("keyword", "Sample").principal(user("TENANT_USER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.resultList").isArray());
        verify(materials).listMaterials(eq(9L), argThat(c -> "Sample".equals(c.getKeyword())));
    }
    @Test void optionsUsePrincipalTenant() throws Exception {
        when(materials.listOptions(9L)).thenReturn(Collections.emptyList());
        mvc.perform(get("/api/v1/co/master/materials/options").principal(user("TENANT_USER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.resultList").isArray());
    }
    @Test void batchUsesStringActorAndRejectsNonAdmin() throws Exception {
        mvc.perform(post("/api/v1/co/master/materials/save-batch").contentType(MediaType.APPLICATION_JSON)
                .content("{}").principal(user("TENANT_USER"))).andExpect(status().isForbidden());
        verifyNoInteractions(batch);
        when(batch.saveBatch(eq(9L), eq("00101"), any())).thenReturn(new MaterialInfoBatchSaveResultVO());
        mvc.perform(post("/api/v1/co/master/materials/save-batch").contentType(MediaType.APPLICATION_JSON)
                .content("{\"materials\":{\"insertedRows\":[]}}").principal(user("TENANT_ADMIN")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.item.materials").isArray());
    }
    @Test void validationReturnsExplicitBadRequest() throws Exception {
        when(materials.createMaterial(eq(9L), eq("00101"), any()))
                .thenThrow(new IllegalArgumentException("품목명은 필수입니다."));
        mvc.perform(post("/api/v1/co/master/materials").contentType(MediaType.APPLICATION_JSON)
                .content("{}").principal(user("TENANT_ADMIN")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.resultMessage").value("품목명은 필수입니다."));
    }
    @Test void rejectsFractionalIntegerJsonWithoutCallingService() throws Exception {
        mvc.perform(post("/api/v1/co/master/materials").contentType(MediaType.APPLICATION_JSON)
                .content("{\"materialWeight\":1.5}").principal(user("TENANT_ADMIN")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/co/master/materials").contentType(MediaType.APPLICATION_JSON)
                .content("{\"expiryedCount\":1.5}").principal(user("TENANT_ADMIN")))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(materials);
    }
}
