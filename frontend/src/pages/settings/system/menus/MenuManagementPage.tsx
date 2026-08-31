import { useEffect, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { MenuManagementPanel } from './components/MenuManagementPanel';
import { fetchMenuRows } from './services/menuManagement.service';
import type { MenuManagementRow } from './types/menuManagement.types';

type MenuManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};

export function MenuManagementPage({
  selectedModule,
  currentMenuName,
  content,
}: MenuManagementPageProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [menus, setMenus] = useState<MenuManagementRow[]>([]);

  useEffect(() => {
    fetchMenuRows().then(setMenus);
  }, []);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid rgba(148,163,184,0.18)',
          bgcolor: isDark
            ? 'rgba(15, 23, 42, 0.75)'
            : 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: '#64748b', letterSpacing: 1.4 }}
        >
          {selectedModule.name} / {currentMenuName}
        </Typography>
        <Typography
          variant="h4"
          component="h1"
          sx={{ mt: 0.5, fontWeight: 800 }}
        >
          {content.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {content.description}
        </Typography>
      </Box>
      <MenuManagementPanel menus={menus} />
    </Box>
  );
}
