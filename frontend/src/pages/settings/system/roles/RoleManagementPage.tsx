import { useCallback, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
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
  const { showSuccess } = useNotification();
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
      <PageHeader
        breadcrumbItems={[selectedModule.name, currentMenuName]}
        description={content.description}
      />
      <PageMessageArea message={error} onClose={() => setError('')} />
      <RoleManagementPanel roles={roles} onCreateRole={handleCreateRole} />
    </Box>
  );
}
