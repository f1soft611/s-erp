import { useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { UserSelectEditor, type F1GridUserValue } from '../../../../../shared/components/f1-grid/editing/UserSelectEditor';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';
import { DocumentReferenceListDialog } from './DocumentReferenceListDialog';

const MAX_VISIBLE_CHIPS = 3;

type DocumentReferenceFieldProps = {
  userOptions: F1GridUserOption[];
  referenceUserIds: string[];
  onChange: (value: F1GridUserValue) => void;
  onOpenSettings?: () => void;
  settingsDisabled?: boolean;
};

export function DocumentReferenceField({
  userOptions,
  referenceUserIds,
  onChange,
  onOpenSettings,
  settingsDisabled = false,
}: DocumentReferenceFieldProps) {
  const [isListOpen, setIsListOpen] = useState(false);
  const selectedUsers = useMemo(
    () =>
      referenceUserIds.flatMap((id) => {
        const user = userOptions.find((option) => String(option.value) === String(id));
        return user ? [user] : [];
      }),
    [referenceUserIds, userOptions],
  );
  const removeUser = (userId: string) =>
    onChange(referenceUserIds.filter((id) => String(id) !== userId));
  return (
    <Box
      data-testid="document-reference-row"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '64px minmax(0, 1fr)', sm: '80px minmax(0, 1fr)' },
        alignItems: 'center',
        gap: { xs: 1, sm: 1.5 },
        minWidth: 0,
        flexShrink: 0,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 700 }}>참조</Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          gap: 1,
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            flex: { xs: '1 1 100%', sm: '1 1 0%' },
            minWidth: 0,
            '& .MuiInputBase-root': {
              height: 40,
              boxSizing: 'border-box',
            },
          }}
        >
          <UserSelectEditor
            value={referenceUserIds}
            options={userOptions}
            multiple
            label="참조자 선택"
            onChange={onChange}
            hideSelectedOptions
            preserveSelectionOrder
            maxVisibleChips={MAX_VISIBLE_CHIPS}
            onOverflowClick={() => setIsListOpen(true)}
          />
        </Box>
        {selectedUsers.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            data-testid="document-reference-list-button"
            onClick={() => setIsListOpen(true)}
            sx={{ boxSizing: 'border-box', flexShrink: 0, height: 40, minHeight: 40 }}
          >
            참조 {selectedUsers.length}명 보기
          </Button>
        )}
        {onOpenSettings && (
          <Button
            size="small"
            variant="outlined"
            disabled={settingsDisabled}
            onClick={onOpenSettings}
            sx={{
              boxSizing: 'border-box',
              flexShrink: 0,
              height: 40,
              minHeight: 40,
            }}
          >
            자주 쓰는 참조자
          </Button>
        )}
      </Box>
      <DocumentReferenceListDialog
        open={isListOpen}
        users={selectedUsers}
        onRemove={removeUser}
        onClear={() => onChange([])}
        onClose={() => setIsListOpen(false)}
      />
    </Box>
  );
}
