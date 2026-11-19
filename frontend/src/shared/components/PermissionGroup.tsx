import { Box } from '@mui/material';
import { AppSaveButton } from './AppSaveButton';
import type { PermissionGroupActionBarProps } from './permissionGroupData';
export type {
  PermissionActionDefinition,
  PermissionActionGroupDefinition,
  PermissionGroupActionBarProps,
  PermissionGroupDefinition,
} from './permissionGroupData';

export function PermissionGroupActionBar({
  groups,
}: PermissionGroupActionBarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
      }}
    >
      {groups.flatMap((group) =>
        group.actions
          .filter((action) => action.visible ?? true)
          .map((action) => {
            const IconComponent = action.icon;
            return (
              <AppSaveButton
                key={`${group.key}-${action.label}`}
                size="small"
                startIcon={
                  IconComponent ? <IconComponent fontSize="small" /> : undefined
                }
                disabled={action.disabled}
                saving={action.saving}
                progressLabel={action.savingAriaLabel}
                onClick={() => {
                  void action.onClick?.();
                }}
                sx={{ whiteSpace: 'nowrap' }}
                variant="contained"
              >
                {action.label}
              </AppSaveButton>
            );
          }),
      )}
    </Box>
  );
}
