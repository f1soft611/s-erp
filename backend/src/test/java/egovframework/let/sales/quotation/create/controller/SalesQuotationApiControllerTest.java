package egovframework.let.sales.quotation.create.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.quotation.create.domain.model.SalesQuotationCreateRequestVO;
import egovframework.let.sales.quotation.create.domain.model.SalesQuotationVO;
import egovframework.let.sales.quotation.create.service.SalesQuotationService;
import egovframework.let.system.menus.service.SystemMenuService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;

class SalesQuotationApiControllerTest {
    private SalesQuotationService service;
    private LoginVO user;
    private MockMvc mvc;
    private SystemMenuService menus;
    @BeforeEach
    void setup() throws Exception {
        service = mock(SalesQuotationService.class);
        menus = mock(SystemMenuService.class);
        user = new LoginVO(); user.setTenantId(71L); user.setId("writer");
        MenuTreeNodeVO root = new MenuTreeNodeVO(); root.setPath("/sales");
        MenuTreeNodeVO leaf = new MenuTreeNodeVO(); leaf.setPath("/sales/quotation-create");
        leaf.setPermissions(new MenuPermissionVO(true, true, true, true));
        root.setChildren(Collections.singletonList(leaf));
        MyMenuResponseVO tree = new MyMenuResponseVO(); tree.setMenus(Collections.singletonList(root));
        when(menus.getMyMenuTree(eq(71L), eq("writer"), any(), any())).thenReturn(tree);
        mvc = MockMvcBuilders.standaloneSetup(new SalesQuotationApiController(new ResultVoHelper(), service, menus))
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    public boolean supportsParameter(MethodParameter p) { return p.getParameterType().equals(LoginVO.class); }
                    public Object resolveArgument(MethodParameter p, ModelAndViewContainer c, NativeWebRequest r, WebDataBinderFactory b) { return user; }
                }).build();
    }

    @Test
    void routesUsePrincipalNotSpoofedTenantAndOptionsAreNotInterpretedAsId() throws Exception {
        SalesQuotationVO result = new SalesQuotationVO(); result.setQuotationId(300L);
        when(service.createQuotation(eq(71L), eq("writer"), any(SalesQuotationCreateRequestVO.class))).thenReturn(result);
        when(service.getQuotation(71L, "writer", 300L)).thenReturn(result);
        when(service.updateQuotation(eq(71L), eq("writer"), eq(300L), any())).thenReturn(result);
        when(service.options(71L, "writer", 10L, "QT")).thenReturn(Collections.singletonList(result));
        String body = "{\"tenantId\":999,\"quotationDt\":\"2026-11-16\",\"customerId\":10,\"details\":[]}";
        mvc.perform(post("/api/v1/sales/quotations").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.result.item.quotationId").value(300));
        mvc.perform(get("/api/v1/sales/quotations/300")).andExpect(status().isOk());
        mvc.perform(put("/api/v1/sales/quotations/300").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        mvc.perform(delete("/api/v1/sales/quotations/300")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/sales/quotations/options").param("customerId", "10").param("keyword", "QT"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.resultCnt").value(1));
        verify(service).createQuotation(eq(71L), eq("writer"), any());
        verify(service).deleteQuotation(71L, "writer", 300L);
        verify(service).options(71L, "writer", 10L, "QT");
    }
    @Test
    void rejectsMissingPrincipal() throws Exception {
        user = null;
        mvc.perform(get("/api/v1/sales/quotations/300")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void rejectsUpdateAndDeleteWithoutMenuPermission() throws Exception {
        when(menus.getMyMenuTree(eq(71L), eq("writer"), any(), any())).thenReturn(new MyMenuResponseVO());
        mvc.perform(put("/api/v1/sales/quotations/300").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/sales/quotations/300")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
}
