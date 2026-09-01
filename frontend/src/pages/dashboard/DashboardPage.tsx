import {
  AppBar,
  Box,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import MenuOpenOutlined from '@mui/icons-material/MenuOpenOutlined';
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSettings } from '../../shared/context/AppSettingsContext';
import { useNotification } from '../../shared/context/NotificationContext';
import {
  SESSION_WARNING_MESSAGE,
  getSessionRemainingLabel,
  getStoredAuth,
  isAccessTokenExpiringSoon,
  logout,
} from '../../shared/services/authService';
import {
  buildPageContent,
  buildModuleItems,
  defaultPage,
  moduleItems as staticModuleItems,
  pageContentMap,
} from './services/dashboardData';
import { buildModuleDescriptors, fetchMyMenus } from './services/menuService';
import { DashboardSidebar } from './components/DashboardSidebar';
import { DashboardContent } from './components/DashboardContent';
import { useDashboardResponsive } from './hooks/useDashboardResponsive';
import type { MenuTreeNode } from './types/dashboard';

const themeOptions = [
  { value: 'light', label: '밝은 테마' },
  { value: 'dark', label: '다크 테마' },
];

const displayScaleOptions = [
  { value: 0.9, label: '작게' },
  { value: 1, label: '보통' },
  { value: 1.1, label: '조금 크게' },
  { value: 1.2, label: '크게' },
  { value: 1.3, label: '가장 크게' },
  { value: 1, label: '초기화', icon: <ReplayOutlined fontSize="small" /> },
];

function findMenuPath(
  nodes: MenuTreeNode[],
  menuId: string,
  parentIds: string[] = [],
  parentNames: string[] = [],
):
  | {
      node: MenuTreeNode;
      parentIds: string[];
      parentNames: string[];
    }
  | undefined {
  for (const node of nodes) {
    if (node.id === menuId) {
      return { node, parentIds, parentNames };
    }

    const childPath = node.children
      ? findMenuPath(
          node.children,
          menuId,
          [...parentIds, node.id],
          [...parentNames, node.name],
        )
      : undefined;

    if (childPath) {
      return childPath;
    }
  }

  return undefined;
}

function DashboardPage() {
  console.log('DashboardPage mount', window.location.pathname);
  const navigate = useNavigate();
  const { showWarning } = useNotification();
  const [moduleItems, setModuleItems] = useState(staticModuleItems);
  const [sessionRemainingLabel, setSessionRemainingLabel] = useState('00:00');
  const warningShownRef = useRef(false);
  const defaultModule = moduleItems[0];
  const defaultMenuId = defaultModule.menus[0]?.id ?? '';

  useEffect(() => {
    let cancelled = false;
    fetchMyMenus().then((response) => {
      if (cancelled || !response) {
        return;
      }
      setModuleItems(buildModuleItems(buildModuleDescriptors(response)));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const location = useLocation();
  const theme = useTheme();
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [displayScaleMenuAnchor, setDisplayScaleMenuAnchor] =
    useState<HTMLElement | null>(null);
  const { themeMode, setThemeMode, displayScale, setDisplayScale } =
    useAppSettings();
  const {
    isMobile,
    isMenuPanelCollapsed,
    isMobileMenuOpen,
    contentRef,
    toggleMenuPanel,
    closeMobileMenu,
  } = useDashboardResponsive();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const routeModuleId = pathSegments[1] ?? defaultModule.id;
  const routeMenuId = pathSegments[2] ?? defaultMenuId;

  const selectedModuleId = moduleItems.some(
    (module) => module.id === routeModuleId,
  )
    ? routeModuleId
    : defaultModule.id;

  const selectedModule =
    moduleItems.find((module) => module.id === selectedModuleId) ??
    moduleItems[0];

  const selectedMenuPath = findMenuPath(selectedModule.tree, routeMenuId);
  const selectedMenu =
    selectedMenuPath?.node.pageKey && !selectedMenuPath.node.children?.length
      ? selectedMenuPath
      : undefined;
  const fallbackMenu = selectedModule.menus[0] ??
    defaultModule.menus[0] ?? {
      id: defaultMenuId,
      name: defaultModule.name,
      pageKey: defaultMenuId,
    };
  const fallbackMenuPath = findMenuPath(selectedModule.tree, fallbackMenu.id);
  const selectedMenuId = selectedMenu?.node.id ?? fallbackMenu.id;
  const expandedItemIds =
    selectedMenu?.parentIds ?? fallbackMenuPath?.parentIds ?? [];
  const currentMenu = selectedMenu?.node ?? fallbackMenu;
  const currentParentNames =
    selectedMenu?.parentNames ?? fallbackMenuPath?.parentNames ?? [];
  const breadcrumbItems = [
    selectedModule.name,
    ...currentParentNames,
    currentMenu.name,
  ];

  useEffect(() => {
    const pathname = location.pathname;
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      const firstMenu = defaultModule.menus[0]?.id ?? defaultMenuId;
      navigate(`/dashboard/${defaultModule.id}/${firstMenu}`, {
        replace: true,
      });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const updateSessionState = () => {
      const auth = getStoredAuth();
      setSessionRemainingLabel(getSessionRemainingLabel(auth));

      if (auth && isAccessTokenExpiringSoon(auth, 60_000)) {
        if (!warningShownRef.current) {
          showWarning(SESSION_WARNING_MESSAGE);
          warningShownRef.current = true;
        }
        return;
      }

      warningShownRef.current = false;
    };

    updateSessionState();
    const intervalId = window.setInterval(updateSessionState, 1000);
    return () => window.clearInterval(intervalId);
  }, [showWarning]);

  const isDarkTheme = themeMode === 'dark';

  const handleModuleChange = (moduleId: string) => {
    const nextModule =
      moduleItems.find((module) => module.id === moduleId) ?? moduleItems[0];
    const nextMenu = nextModule.menus[0]?.id ?? defaultMenuId;
    navigate(`/dashboard/${nextModule.id}/${nextMenu}`);
  };

  const handleMenuSelect = (menuId: string) => {
    navigate(`/dashboard/${selectedModuleId}/${menuId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleOpenThemeMenu = (event: MouseEvent<HTMLElement>) => {
    setThemeMenuAnchor(event.currentTarget);
  };

  const handleOpenDisplayScaleMenu = (event: MouseEvent<HTMLElement>) => {
    setDisplayScaleMenuAnchor(event.currentTarget);
  };

  const handleThemeChange = (value: string) => {
    const nextTheme = value === 'dark' ? 'dark' : 'light';
    setThemeMode(nextTheme);
    setThemeMenuAnchor(null);
  };

  const handleDisplayScaleChange = (value: number | string) => {
    const nextScale = value === 'reset' ? 1 : Number(value);
    setDisplayScale(nextScale);
    setDisplayScaleMenuAnchor(null);
  };

  const content = useMemo(() => {
    const baseContent =
      pageContentMap[currentMenu.pageKey ?? defaultMenuId] ?? defaultPage;
    return buildPageContent(baseContent, currentMenu);
  }, [currentMenu]);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <DashboardSidebar
        moduleItems={moduleItems}
        selectedModuleId={selectedModuleId}
        selectedModule={selectedModule}
        expandedItemIds={expandedItemIds}
        selectedMenuId={selectedMenuId}
        onModuleChange={handleModuleChange}
        onMenuSelect={handleMenuSelect}
        isMenuPanelCollapsed={isMenuPanelCollapsed}
        isMobile={isMobile}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMenu={toggleMenuPanel}
        onCloseMobileMenu={closeMobileMenu}
      />

      <Box
        ref={contentRef}
        sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              px: { xs: 1, md: 3 },
              py: 1.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                aria-label={
                  isMobile
                    ? isMobileMenuOpen
                      ? '메뉴 닫기'
                      : '메뉴 열기'
                    : isMenuPanelCollapsed
                      ? '메뉴 패널 펼치기'
                      : '메뉴 패널 접기'
                }
                aria-expanded={
                  isMobile ? isMobileMenuOpen : !isMenuPanelCollapsed
                }
                onClick={toggleMenuPanel}
                sx={{ color: theme.palette.text.secondary }}
              >
                {isMobile && isMobileMenuOpen ? (
                  <MenuOpenOutlined fontSize="small" />
                ) : isMobile || isMenuPanelCollapsed ? (
                  <MenuOutlined fontSize="small" />
                ) : (
                  <MenuOpenOutlined fontSize="small" />
                )}
              </IconButton>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
                {currentMenu.name}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                ml: 'auto',
                minWidth: 0,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: theme.palette.action.hover,
                  color: theme.palette.text.secondary,
                  fontWeight: 700,
                }}
              >
                로그인 유지 시간 {sessionRemainingLabel}
              </Typography>
              <Tooltip title="테마 설정">
                <IconButton
                  aria-label="테마 설정"
                  aria-controls={
                    themeMenuAnchor ? 'theme-settings-menu' : undefined
                  }
                  aria-haspopup="menu"
                  aria-expanded={themeMenuAnchor ? 'true' : undefined}
                  onClick={handleOpenThemeMenu}
                  sx={{ color: theme.palette.text.secondary }}
                >
                  {isDarkTheme ? (
                    <DarkModeOutlined fontSize="small" />
                  ) : (
                    <LightModeOutlined fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
              <Menu
                id="theme-settings-menu"
                anchorEl={themeMenuAnchor}
                open={Boolean(themeMenuAnchor)}
                onClose={() => setThemeMenuAnchor(null)}
              >
                {themeOptions.map((option) => (
                  <MenuItem
                    key={option.value}
                    selected={themeMode === option.value}
                    onClick={() => handleThemeChange(option.value)}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Menu>
              <Tooltip title="화면크기 설정">
                <IconButton
                  aria-label="화면크기 설정"
                  aria-controls={
                    displayScaleMenuAnchor
                      ? 'display-scale-settings-menu'
                      : undefined
                  }
                  aria-haspopup="menu"
                  aria-expanded={displayScaleMenuAnchor ? 'true' : undefined}
                  onClick={handleOpenDisplayScaleMenu}
                  sx={{ color: theme.palette.text.secondary }}
                >
                  <TuneOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
              <Menu
                id="display-scale-settings-menu"
                anchorEl={displayScaleMenuAnchor}
                open={Boolean(displayScaleMenuAnchor)}
                onClose={() => setDisplayScaleMenuAnchor(null)}
              >
                {displayScaleOptions.map((option) => (
                  <MenuItem
                    key={`${option.label}-${String(option.value)}`}
                    selected={Number(option.value) === Number(displayScale)}
                    onClick={() => handleDisplayScaleChange(option.value)}
                  >
                    {option.icon ? (
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {option.icon}
                      </ListItemIcon>
                    ) : null}
                    {option.label}
                  </MenuItem>
                ))}
              </Menu>
              <IconButton
                aria-label="notifications"
                sx={{ color: theme.palette.text.secondary }}
              >
                <NotificationsOutlined fontSize="small" />
              </IconButton>
              <IconButton
                aria-label="logout"
                sx={{ color: theme.palette.text.secondary }}
                onClick={handleLogout}
              >
                <LogoutOutlined fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </AppBar>

        <DashboardContent
          selectedModule={selectedModule}
          currentMenuName={currentMenu.name}
          currentPageKey={currentMenu.pageKey ?? defaultMenuId}
          breadcrumbItems={breadcrumbItems}
          content={content}
          selectedMenuPermissions={currentMenu.permissions}
        />
      </Box>
    </Box>
  );
}

export default DashboardPage;
