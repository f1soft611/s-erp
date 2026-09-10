import {
  AppBar,
  Box,
  CircularProgress,
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
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSettings } from '../../shared/context/AppSettingsContext';
import { logout } from '../../shared/services/authService';
import {
  buildPageContent,
  buildModuleItems,
  defaultPage,
  pageContentMap,
} from './services/dashboardData';
import {
  buildModuleDescriptors,
  fetchMyMenus,
  hydrateModuleDescriptors,
} from './services/menuService';
import { fetchModuleRows } from '../settings/system/modules/services/moduleManagement.service';
import { DashboardSidebar } from './components/DashboardSidebar';
import { DashboardContent } from './components/DashboardContent';
import { useDashboardResponsive } from './hooks/useDashboardResponsive';
import type { MenuTreeNode, ModuleItem } from './types/dashboard';
import { NotFoundPage } from '../errors/NotFoundPage';

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

const normalizeRoutePath = (path?: string | null): string => {
  const normalized = (path ?? '').trim();
  if (!normalized || normalized === '/') {
    return '/';
  }

  return normalized.replace(/\/+$/, '') || '/';
};

const resolveLegacyRoutePath = (pathname: string): string => {
  if (!pathname || pathname === '/') {
    return '/';
  }

  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return '/';
  }

  if (pathname.startsWith('/dashboard/')) {
    return pathname.replace(/^\/dashboard/, '') || '/';
  }

  return pathname;
};

const getModuleRoutePath = (module: ModuleItem): string =>
  normalizeRoutePath(module.path ?? `/${module.id}`);

const getMenuRoutePath = (module: ModuleItem, menuId: string): string => {
  const modulePath = getModuleRoutePath(module);
  const directMatch =
    module.menus.find((menu) => menu.id === menuId)?.path ??
    findMenuPath(module.tree, menuId)?.node.path;

  if (directMatch) {
    return normalizeRoutePath(directMatch);
  }

  return `${modulePath === '/' ? '' : modulePath}/${menuId}` || '/';
};

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
  const [moduleItems, setModuleItems] = useState<ModuleItem[]>([]);
  const [menusLoading, setMenusLoading] = useState(true);
  const [menusError, setMenusError] = useState(false);
  const [menusReloadToken, setMenusReloadToken] = useState(0);
  const defaultModule = moduleItems[0];
  const defaultMenuId = defaultModule?.menus[0]?.id ?? '';
  const emptyModule: ModuleItem = {
    id: '',
    name: '접근 가능한 메뉴 없음',
    icon: null,
    tree: [],
    menus: [],
  };

  useEffect(() => {
    let cancelled = false;
    const wait = (ms: number) =>
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      });

    // 로그인 직후 토큰 갱신 등과 겹치는 순간적인 네트워크 오류를 흡수하기 위해 1회 재시도한다.
    const loadOnce = () => Promise.all([fetchMyMenus(), fetchModuleRows()]);

    setMenusLoading(true);
    setMenusError(false);

    loadOnce()
      .catch(async (error) => {
        if (cancelled) {
          throw error;
        }
        await wait(500);
        return loadOnce();
      })
      .then(([response, moduleRows]) => {
        if (cancelled) {
          return;
        }

        const sourceModules = buildModuleDescriptors(response);
        setModuleItems(
          buildModuleItems(hydrateModuleDescriptors(sourceModules, moduleRows)),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMenusError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMenusLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [menusReloadToken]);
  const location = useLocation();
  const effectivePath = resolveLegacyRoutePath(location.pathname);
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
  const pathSegments = effectivePath.split('/').filter(Boolean);
  const routeModuleId = pathSegments[0] ?? defaultModule?.id ?? '';
  const routeMenuId =
    pathSegments.length > 1
      ? pathSegments[pathSegments.length - 1]
      : defaultMenuId;

  const selectedModuleId = moduleItems.some(
    (module) =>
      module.id === routeModuleId ||
      normalizeRoutePath(module.path ?? `/${module.id}`) ===
        normalizeRoutePath(effectivePath),
  )
    ? routeModuleId
    : (defaultModule?.id ?? '');

  const selectedModule =
    moduleItems.find((module) => module.id === selectedModuleId) ??
    moduleItems[0] ??
    emptyModule;

  const selectedMenuPath = findMenuPath(selectedModule.tree, routeMenuId);
  const selectedMenu =
    selectedMenuPath && !selectedMenuPath.node.children?.length
      ? selectedMenuPath
      : undefined;
  const fallbackMenu = selectedModule.menus[0] ??
    defaultModule?.menus[0] ?? {
      id: defaultMenuId || 'empty-access',
      name: selectedModule.name,
      pageKey: defaultMenuId || 'empty-access',
    };
  const fallbackMenuPath = findMenuPath(selectedModule.tree, fallbackMenu.id);
  const selectedMenuId = selectedMenu?.node.id ?? fallbackMenu.id;
  const expandedItemIds =
    selectedMenu?.parentIds ?? fallbackMenuPath?.parentIds ?? [];
  const currentMenu = selectedMenu?.node ?? fallbackMenu;
  const currentPageKey = currentMenu.pageKey ?? currentMenu.id ?? defaultMenuId;
  const currentParentNames =
    selectedMenu?.parentNames ?? fallbackMenuPath?.parentNames ?? [];
  const breadcrumbItems = [
    selectedModule.name,
    ...currentParentNames,
    currentMenu.name,
  ];

  const isValidDashboardRoute = useMemo(() => {
    const normalizedPath = normalizeRoutePath(effectivePath);
    if (normalizedPath === '/') {
      return true;
    }

    const validPaths = new Set<string>(['/']);
    moduleItems.forEach((module) => {
      validPaths.add(normalizeRoutePath(module.path ?? `/${module.id}`));

      const collectTreePaths = (nodes: MenuTreeNode[]) => {
        nodes.forEach((node) => {
          if (node.path) {
            validPaths.add(normalizeRoutePath(node.path));
          }
          if (node.children?.length) {
            collectTreePaths(node.children);
          }
        });
      };

      collectTreePaths(module.tree);
      module.menus.forEach((menu) => {
        if (menu.path) {
          validPaths.add(normalizeRoutePath(menu.path));
        }
      });
    });

    return validPaths.has(normalizedPath);
  }, [effectivePath, moduleItems]);

  useEffect(() => {
    const pathname = location.pathname;
    if (!defaultModule) {
      return;
    }

    const isRootDashboardAlias =
      pathname === '/' ||
      pathname === '/dashboard' ||
      pathname === '/dashboard/';

    if (isRootDashboardAlias) {
      const firstMenu = defaultModule.menus[0];
      const nextPath =
        (firstMenu?.path ??
          getMenuRoutePath(defaultModule, firstMenu?.id ?? defaultMenuId)) ||
        getModuleRoutePath(defaultModule);

      if (nextPath !== pathname) {
        navigate(nextPath, { replace: true });
      }
    }
  }, [defaultModule, defaultMenuId, location.pathname, navigate]);

  const isDarkTheme = themeMode === 'dark';

  const handleModuleChange = (moduleId: string) => {
    const nextModule =
      moduleItems.find((module) => module.id === moduleId) ?? moduleItems[0];
    if (!nextModule) {
      return;
    }

    const nextMenu = nextModule.menus[0];
    const nextPath =
      nextMenu?.path ??
      (nextMenu
        ? getMenuRoutePath(nextModule, nextMenu.id)
        : getModuleRoutePath(nextModule));
    navigate(nextPath);
  };

  const handleMenuSelect = (menuId: string) => {
    const targetPath = getMenuRoutePath(selectedModule, menuId);
    navigate(targetPath);
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
      pageContentMap[currentPageKey] ?? pageContentMap[defaultMenuId] ?? defaultPage;
    return buildPageContent(baseContent, currentMenu);
  }, [currentMenu, currentPageKey, defaultMenuId]);

  const hasAccessibleMenu = moduleItems.length > 0;

  if (menusError) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: theme.palette.background.default,
          color: theme.palette.text.primary,
        }}
      >
        <Typography variant="body1">
          메뉴 정보를 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해
          주세요.
        </Typography>
        <IconButton
          aria-label="메뉴 다시 불러오기"
          onClick={() => setMenusReloadToken((token) => token + 1)}
        >
          <ReplayOutlined />
        </IconButton>
      </Box>
    );
  }

  if (!menusLoading && !isValidDashboardRoute) {
    return <NotFoundPage />;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        minHeight: 0,
        overflow: 'hidden',
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      {menusLoading ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress size={34} />
        </Box>
      ) : (
        <>
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
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {hasAccessibleMenu ? (
              <>
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
                      <Typography
                        variant="h6"
                        component="h1"
                        sx={{ fontWeight: 700 }}
                      >
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
                          aria-expanded={
                            displayScaleMenuAnchor ? 'true' : undefined
                          }
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
                            selected={
                              Number(option.value) === Number(displayScale)
                            }
                            onClick={() =>
                              handleDisplayScaleChange(option.value)
                            }
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
                  currentPageKey={currentPageKey}
                  breadcrumbItems={breadcrumbItems}
                  content={content}
                  selectedMenuPermissions={currentMenu.permissions}
                />
              </>
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 3,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  접근 가능한 메뉴가 없습니다.
                </Typography>
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

export default DashboardPage;
