import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { UserSelectEditor } from '../../../../../shared/components/f1-grid/editing/UserSelectEditor';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';
import type { F1GridUserValue } from '../../../../../shared/components/f1-grid/editing/UserSelectEditor';
import type { DocumentApprovalStage } from '../types/documentWrite.types';

type DocumentApprovalFieldsProps = {
  userOptions: F1GridUserOption[];
  selectedApprovalUserIds: string[];
  referenceUserIds: string[];
  approvalStages: DocumentApprovalStage[];
  onApprovalUserChange: (value: F1GridUserValue) => void;
  onReferenceUserChange: (value: F1GridUserValue) => void;
  onAddApproval: () => void;
  onAddAgreement: () => void;
  onRemoveApprovalStage: (stageId: number) => void;
};

function RecipientSummary({ users }: { users: F1GridUserOption[] }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {users.map((user) => (
        <Box
          key={String(user.value)}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}
        >
          <Avatar
            src={user.avatarUrl ?? undefined}
            sx={{ width: 28, height: 28, fontSize: '0.75rem' }}
          >
            {user.label.slice(0, 1)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {user.label}
            </Typography>
            {user.departmentName && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {user.departmentName}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function SealSlot({ kind }: { kind: 'approval' | 'agreement' }) {
  const label = kind === 'approval' ? '결재' : '합의';
  return (
    <Box
      aria-label={`${label} 도장 자리`}
      sx={{
        display: 'grid',
        placeItems: 'center',
        flex: '0 0 auto',
        width: 44,
        height: 44,
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 1,
        color: 'text.disabled',
        fontSize: '0.72rem',
      }}
    >
      도장
    </Box>
  );
}

export function DocumentApprovalFields({
  userOptions,
  selectedApprovalUserIds,
  referenceUserIds,
  approvalStages,
  onApprovalUserChange,
  onReferenceUserChange,
  onAddApproval,
  onAddAgreement,
  onRemoveApprovalStage,
}: DocumentApprovalFieldsProps) {
  const selectedApprovalUsers = userOptions.filter((user) =>
    selectedApprovalUserIds.includes(String(user.value)),
  );
  const referenceUsers = userOptions.filter((user) =>
    referenceUserIds.includes(String(user.value)),
  );

  return (
    <Box
      data-testid="document-approval-fields"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 320px' },
        gap: 1.5,
        flexShrink: 0,
      }}
    >
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          결재선
        </Typography>
        <UserSelectEditor
          value={selectedApprovalUserIds}
          options={userOptions}
          multiple
          label="결재선 사용자 선택"
          onChange={onApprovalUserChange}
        />
        {selectedApprovalUsers.length > 0 && (
          <RecipientSummary users={selectedApprovalUsers} />
        )}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            disabled={selectedApprovalUserIds.length !== 1}
            onClick={onAddApproval}
          >
            결재 추가
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={selectedApprovalUserIds.length === 0}
            onClick={onAddAgreement}
          >
            합의 추가
          </Button>
        </Box>
        {userOptions.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            선택 가능한 사용자가 없습니다.
          </Typography>
        )}
        <Stack spacing={0.75}>
          {approvalStages.map((stage, index) => (
            <Box
              key={stage.id}
              data-testid="document-approval-stage"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
                p: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Avatar
                aria-hidden="true"
                sx={{ width: 28, height: 28, fontSize: '0.8rem' }}
              >
                {index + 1}
              </Avatar>
              <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {stage.kind === 'approval' ? '결재' : '합의'} {index + 1}
                </Typography>
                <RecipientSummary users={stage.users} />
              </Stack>
              <SealSlot kind={stage.kind} />
              <IconButton
                size="small"
                aria-label={`${stage.kind === 'approval' ? '결재' : '합의'} 단계 ${index + 1} 삭제`}
                onClick={() => onRemoveApprovalStage(stage.id)}
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          참조
        </Typography>
        <UserSelectEditor
          value={referenceUserIds}
          options={userOptions}
          multiple
          label="참조자 선택"
          onChange={onReferenceUserChange}
        />
        <Box data-testid="document-reference-list">
          <RecipientSummary users={referenceUsers} />
        </Box>
        {userOptions.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            선택 가능한 사용자가 없습니다.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
