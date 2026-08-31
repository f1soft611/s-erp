import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { useNotification } from '../../../../shared/context/NotificationContext';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { RoleManagementPanel } from './components/RoleManagementPanel';
import {
  createRole,
  fetchRoleRows,
  type RoleSavePayload,
} from './services/roleManagement.service';
import type { RoleManagementRow } from './types/roleManagement.types';

type RoleManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};

export function RoleManagementPage({
  selectedModule,
  currentMenuName,
  content,
}: RoleManagementPageProps) {
  const theme = useTheme();
  const { showSuccess } = useNotification();
  const isDark = theme.palette.mode === 'dark';
  const [roles, setRoles] = useState<RoleManagementRow[]>([]);
  const [error, setError] = useState('');

  const loadRoles = useCallback(async () => {
    setError('');
    try {
      setRoles(await fetchRoleRows());
    } catch (requestError) {
      setRoles([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : '역할 목록을 불러오지 못했습니다.',
      );
      throw requestError;
    }
  }, []);

  useEffect(() => {
    void loadRoles().catch(() => undefined);
  }, [loadRoles]);

  const handleCreateRole = async (payload: RoleSavePayload) => {
    setError('');
    try {
      await createRole(payload);
      await loadRoles();
      showSuccess('역할을 저장했습니다.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '역할 저장에 실패했습니다.',
      );
      throw requestError;
    }
  };

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
      <PageMessageArea message={error} onClose={() => setError('')} />
      <RoleManagementPanel roles={roles} onCreateRole={handleCreateRole} />
    </Box>
  );
}
