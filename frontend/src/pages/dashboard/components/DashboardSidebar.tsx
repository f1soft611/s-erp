import { Drawer, useTheme } from '@mui/material';
import type { ModuleItem } from '../types/dashboard';
import { DashboardMenuTree } from './DashboardMenuTree';
import { DashboardModuleSection } from './DashboardModuleSection';

type DashboardSidebarProps = {
  moduleItems: ModuleItem[];
  selectedModuleId: string;
  selectedModule: ModuleItem;
  expandedItemIds: string[];
  selectedMenuId: string;
  onModuleChange: (moduleId: string) => void;
  onMenuSelect: (menuId: string) => void;
};

export function DashboardSidebar({
  moduleItems,
  selectedModuleId,
  selectedModule,
  expandedItemIds,
  selectedMenuId,
  onModuleChange,
  onMenuSelect,
}: DashboardSidebarProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 380,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 380,
          bgcolor: isDark ? '#0f172a' : '#f8fafc',
          color: isDark ? '#e2e8f0' : '#0f172a',
          borderRight: `1px solid ${theme.palette.divider}`,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'row',
          boxShadow: isDark ? 'inset 0 0 0 1px rgba(148,163,184,0.08)' : 'none',
        },
      }}
    >
      <DashboardModuleSection
        moduleItems={moduleItems}
        selectedModuleId={selectedModuleId}
        onModuleChange={onModuleChange}
      />

      <DashboardMenuTree
        selectedModule={selectedModule}
        expandedItemIds={expandedItemIds}
        selectedMenuId={selectedMenuId}
        onMenuSelect={onMenuSelect}
      />
    </Drawer>
  );
}
