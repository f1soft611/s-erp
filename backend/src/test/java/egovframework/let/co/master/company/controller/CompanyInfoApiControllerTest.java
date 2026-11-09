package egovframework.let.co.master.company.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.company.domain.model.CompanyInfoVO;
import egovframework.let.co.master.company.service.CompanyInfoService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

@ExtendWith(MockitoExtension.class)
class CompanyInfoApiControllerTest {

    @Mock
    private CompanyInfoService companyInfoService;

    @Mock
    private SystemMenuService systemMenuService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        CompanyInfoApiController controller =
                new CompanyInfoApiController(new ResultVoHelper(), companyInfoService, systemMenuService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
                .build();
    }

    @Test
    void getCompanyInfoUsesAuthenticatedTenantAndReturnsItem() throws Exception {
        when(systemMenuService.getMyMenuTree(9L, "user-1", null, "TENANT_USER"))
                .thenReturn(menuTree(true, false));
        CompanyInfoVO company = new CompanyInfoVO();
        company.setCompanyName("Example Co.");
        company.setBusinessNo("123-45-67890");
        when(companyInfoService.getCompanyInfo(9L)).thenReturn(company);

        mockMvc.perform(get("/api/v1/co/master/company")
                        .principal(authenticationForTenant(9L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.companyName").value("Example Co."))
                .andExpect(jsonPath("$.result.item.businessNo").value("123-45-67890"));

        verify(companyInfoService).getCompanyInfo(9L);
    }

    @Test
    void updateCompanyInfoUsesAuthenticatedTenantAndRequiresUpdatePermission() throws Exception {
        when(systemMenuService.getMyMenuTree(9L, "user-1", null, "TENANT_USER"))
                .thenReturn(menuTree(true, true));
        CompanyInfoVO company = new CompanyInfoVO();
        company.setCompanyName("Example Co.");
        when(companyInfoService.updateCompanyInfo(eq(9L), org.mockito.ArgumentMatchers.any()))
                .thenReturn(company);

        mockMvc.perform(put("/api/v1/co/master/company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyName\":\"Example Co.\"}")
                        .principal(authenticationForTenant(9L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.companyName").value("Example Co."));

        verify(companyInfoService).updateCompanyInfo(eq(9L),
                org.mockito.ArgumentMatchers.argThat(request ->
                        "Example Co.".equals(request.getCompanyName())));
    }

    @Test
    void rejectsUpdateWithoutMenuPermissionBeforeCallingService() throws Exception {
        when(systemMenuService.getMyMenuTree(9L, "user-1", null, "TENANT_USER"))
                .thenReturn(menuTree(true, false));

        mockMvc.perform(put("/api/v1/co/master/company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyName\":\"Example Co.\"}")
                        .principal(authenticationForTenant(9L)))
                .andExpect(status().isForbidden());

        verifyNoInteractions(companyInfoService);
    }

    private MyMenuResponseVO menuTree(boolean read, boolean update) {
        MenuTreeNodeVO module = new MenuTreeNodeVO();
        module.setPath("/co");
        MenuTreeNodeVO company = new MenuTreeNodeVO();
        company.setPath("/co/master/company-info");
        company.setPermissions(new MenuPermissionVO(read, false, update, false));
        module.setChildren(Arrays.asList(company));
        MyMenuResponseVO tree = new MyMenuResponseVO();
        tree.setMenus(Arrays.asList(module));
        return tree;
    }

    private UsernamePasswordAuthenticationToken authenticationForTenant(Long tenantId) {
        LoginVO user = new LoginVO();
        user.setTenantId(tenantId);
        user.setId("user-1");
        user.setRoleCode("TENANT_USER");
        return new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList());
    }

    private static class AuthenticationPrincipalResolver implements HandlerMethodArgumentResolver {
        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
        }

        @Override
        public Object resolveArgument(MethodParameter parameter,
                ModelAndViewContainer container, NativeWebRequest request,
                org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
            return ((UsernamePasswordAuthenticationToken) request.getUserPrincipal()).getPrincipal();
        }
    }
}
