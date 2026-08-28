import {
  AppBar,
  Box,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Typography,
  useTheme,
} from '@mui/material';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSettings } from '../../shared/context/AppSettingsContext';
import { logout } from '../../shared/services/authService';
import {
  defaultPage,
  moduleItems,
  pageContentMap,
} from './services/dashboardData';
import { DashboardSidebar } from './components/DashboardSidebar';
import { DashboardContent } from './components/DashboardContent';
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
): { node: MenuTreeNode; parentIds: string[] } | undefined {
  for (const node of nodes) {
    if (node.id === menuId) {
      return { node, parentIds };
    }

    const childPath = node.children
      ? findMenuPath(node.children, menuId, [...parentIds, node.id])
      : undefined;

    if (childPath) {
      return childPath;
    }
  }

  return undefined;
}

const defaultModule = moduleItems[0];
const defaultMenuId = defaultModule.menus[0]?.id ?? '';

function DashboardPage() {
  console.log('DashboardPage mount', window.location.pathname);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { themeMode, setThemeMode, displayScale, setDisplayScale } =
    useAppSettings();
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

  useEffect(() => {
    const pathname = location.pathname;
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      const firstMenu = defaultModule.menus[0]?.id ?? defaultMenuId;
      navigate(`/dashboard/${defaultModule.id}/${firstMenu}`, {
        replace: true,
      });
    }
  }, [location.pathname, navigate]);

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

  const handleThemeChange = (event: { target: { value: string } }) => {
    const nextTheme = event.target.value === 'dark' ? 'dark' : 'light';
    setThemeMode(nextTheme);
  };

  const handleDisplayScaleChange = (event: {
    target: { value: number | string };
  }) => {
    const rawValue = event.target.value;
    const nextScale = rawValue === 'reset' ? 1 : Number(rawValue);
    setDisplayScale(nextScale);
  };

  const content = useMemo(
    () => pageContentMap[currentMenu.pageKey ?? defaultMenuId] ?? defaultPage,
    [currentMenu.pageKey],
  );

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
      />

      <Box
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
                대시보드
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
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                }}
              >
                <FormControl
                  size="small"
                  sx={{
                    minWidth: { xs: 120, md: 128 },
                    flex: { xs: '1 1 120px', md: '0 0 auto' },
                  }}
                >
                  <Select
                    value={themeMode}
                    onChange={handleThemeChange}
                    displayEmpty
                    renderValue={(selected) => {
                      const option = themeOptions.find(
                        (item) => item.value === selected,
                      );
                      return (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                          }}
                        >
                          {isDarkTheme ? (
                            <DarkModeOutlined
                              fontSize="small"
                              sx={{ color: '#93c5fd' }}
                            />
                          ) : (
                            <LightModeOutlined
                              fontSize="small"
                              sx={{ color: '#f59e0b' }}
                            />
                          )}
                          <Typography
                            component="span"
                            sx={{ fontSize: '0.9rem', fontWeight: 600 }}
                          >
                            {option?.label ?? '테마'}
                          </Typography>
                        </Box>
                      );
                    }}
                    sx={{
                      minHeight: 38,
                      borderRadius: '999px',
                      border: `1px solid ${theme.palette.divider}`,
                      backgroundColor: isDarkTheme ? '#111827' : '#f8fafc',
                      color: theme.palette.text.primary,
                      px: 1,
                      py: 0.25,
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      boxShadow: isDarkTheme
                        ? 'inset 0 0 0 1px rgba(148, 163, 184, 0.18)'
                        : 'inset 0 0 0 1px rgba(148, 163, 184, 0.12)',
                      '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        py: 0.6,
                        pr: 3,
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderWidth: 0,
                      },
                      '&:focus-within': {
                        outline: 'none',
                        borderColor: theme.palette.primary.main,
                        boxShadow: `0 0 0 3px ${theme.palette.primary.main}22`,
                      },
                    }}
                    inputProps={{ 'aria-label': '테마' }}
                  >
                    {themeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl
                  size="small"
                  sx={{
                    minWidth: { xs: 130, md: 150 },
                    flex: { xs: '1 1 130px', md: '0 0 auto' },
                  }}
                >
                  <Select
                    value={displayScale}
                    onChange={handleDisplayScaleChange}
                    displayEmpty
                    renderValue={(selected) => {
                      const option = displayScaleOptions.find(
                        (item) => Number(item.value) === Number(selected),
                      );
                      return (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                          }}
                        >
                          <TuneOutlined
                            fontSize="small"
                            sx={{ color: '#8b5cf6' }}
                          />
                          <Typography
                            component="span"
                            sx={{ fontSize: '0.9rem', fontWeight: 600 }}
                          >
                            {option?.label ?? '화면크기'}
                          </Typography>
                        </Box>
                      );
                    }}
                    sx={{
                      minHeight: 38,
                      borderRadius: '999px',
                      border: `1px solid ${theme.palette.divider}`,
                      backgroundColor: isDarkTheme ? '#111827' : '#f8fafc',
                      color: theme.palette.text.primary,
                      px: 1,
                      py: 0.25,
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      boxShadow: isDarkTheme
                        ? 'inset 0 0 0 1px rgba(148, 163, 184, 0.18)'
                        : 'inset 0 0 0 1px rgba(148, 163, 184, 0.12)',
                      '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        py: 0.6,
                        pr: 3,
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderWidth: 0,
                      },
                      '&:focus-within': {
                        outline: 'none',
                        borderColor: theme.palette.primary.main,
                        boxShadow: `0 0 0 3px ${theme.palette.primary.main}22`,
                      },
                    }}
                    inputProps={{ 'aria-label': '화면크기' }}
                  >
                    {displayScaleOptions.map((option) => (
                      <MenuItem
                        key={`${option.label}-${String(option.value)}`}
                        value={option.value}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
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
          content={content}
        />
      </Box>
    </Box>
  );
}

export default DashboardPage;
