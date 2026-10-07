import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { Box, Button, IconButton, Typography } from '@mui/material';
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
  onRemoveApprovalUser: (stageId: number, userId: string) => void;
};

function SealSlot({ kind }: { kind: 'approval' | 'agreement' }) {
  const label = kind === 'approval' ? '결재' : '합의';
  return (
    <Box
      aria-label={`${label} 도장 자리`}
      sx={{
        display: 'grid',
        placeItems: 'center',
        flex: '0 0 auto',
        width: 30,
        height: 30,
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
  onRemoveApprovalUser,
}: DocumentApprovalFieldsProps) {
  const assignedApprovalUserIds = new Set(
    approvalStages.flatMap((stage) =>
      stage.users.map((user) => String(user.value)),
    ),
  );
  const approvalOptions = userOptions.filter(
    (user) => !assignedApprovalUserIds.has(String(user.value)),
  );
  let sequence = 0;
  const participants = approvalStages.flatMap((stage) =>
    stage.users.map((user) => ({
      stageId: stage.id,
      kind: stage.kind,
      user,
      sequence: ++sequence,
    })),
  );
  const approvalParticipants = participants.filter(
    (participant) => participant.kind === 'approval',
  );
  const agreementParticipants = participants.filter(
    (participant) => participant.kind === 'agreement',
  );
  const nextApprovalNumber = participants.length + 1;
  const labeledRowSx = {
    display: 'grid',
    gridTemplateColumns: { xs: '64px minmax(0, 1fr)', sm: '80px minmax(0, 1fr)' },
    alignItems: 'start',
    gap: { xs: 1, sm: 1.5 },
    minWidth: 0,
  } as const;

  return (
    <Box
      data-testid="document-approval-fields"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        minWidth: 0,
        flexShrink: 0,
      }}
    >
      <Box
        data-testid="document-approval-input-row"
        sx={{
          ...labeledRowSx,
          alignItems: 'center',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          결재선
        </Typography>
        <Box
          data-testid="document-approval-active-field"
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.75,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              flex: '1 1 180px',
              minWidth: 0,
              '& .MuiInputBase-root': {
                height: 40,
                boxSizing: 'border-box',
              },
            }}
          >
            <UserSelectEditor
              value={selectedApprovalUserIds}
              options={approvalOptions}
              multiple
              hideSelectedOptions
              preserveSelectionOrder
              label={`결재선 ${nextApprovalNumber} 사용자 선택`}
              onChange={onApprovalUserChange}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flex: '0 0 auto' }}>
            <Button
              variant="outlined"
              size="small"
              disabled={selectedApprovalUserIds.length === 0}
              onClick={onAddApproval}
              sx={{ whiteSpace: 'nowrap', height: 40, minHeight: 40 }}
            >
              결재 추가
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={selectedApprovalUserIds.length === 0}
              onClick={onAddAgreement}
              sx={{ whiteSpace: 'nowrap', height: 40, minHeight: 40 }}
            >
              합의 추가
            </Button>
          </Box>
        </Box>
      </Box>

      <Box data-testid="document-approval-display-row" sx={labeledRowSx}>
        <Typography variant="body2" sx={{ fontWeight: 700, pt: 0.5 }}>
          결재
        </Typography>
        <Box
          data-testid="document-approval-grid"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 0.5,
            minWidth: 0,
          }}
        >
          {approvalParticipants.map(({ stageId, user, sequence: order }) => (
            <Box
              key={`${stageId}-${String(user.value)}`}
              role="group"
              aria-label={`결재 ${order} ${user.label}`}
              data-testid="document-approval-person"
              sx={{
                display: 'grid',
                gridTemplateRows: '32px 64px 32px',
                minWidth: 0,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ alignContent: 'center', px: 0.5, textAlign: 'center' }}
              >
                {user.positionName ?? ''}
              </Typography>
              <Box
                aria-label="결재 도장 자리"
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  borderBlock: '1px solid',
                  borderColor: 'divider',
                  color: 'text.disabled',
                  fontSize: '0.75rem',
                }}
              >
                도장
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '20px minmax(0, 1fr) 28px',
                  alignItems: 'center',
                  minWidth: 0,
                  px: 0.5,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {order}
                </Typography>
                <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                  {user.label}
                </Typography>
                <IconButton
                  size="small"
                  aria-label={`결재 참여자 ${order} ${user.label} 삭제`}
                  onClick={() =>
                    onRemoveApprovalUser(stageId, String(user.value))
                  }
                  sx={{ p: 0.25 }}
                >
                  <DeleteOutlineOutlinedIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Box data-testid="document-agreement-display-row" sx={labeledRowSx}>
        <Typography variant="body2" sx={{ fontWeight: 700, pt: 0.5 }}>
          합의
        </Typography>
        <Box
          data-testid="document-agreement-list"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.75,
            minWidth: 0,
          }}
        >
          {agreementParticipants.map(({ stageId, user, sequence: order }) => (
            <Box
              key={`${stageId}-${String(user.value)}`}
              role="group"
              aria-label={`합의 ${order} ${user.label}`}
              data-testid="document-agreement-chip"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                flex: '0 0 auto',
                height: 40,
                px: 0.75,
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 1,
                bgcolor: 'grey.100',
              }}
            >
              <Typography
                variant="caption"
                aria-label={`결재 순번 ${order}`}
                sx={{ fontWeight: 700 }}
              >
                {order}
              </Typography>
              <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                {user.label}
              </Typography>
              <SealSlot kind="agreement" />
              <IconButton
                size="small"
                aria-label={`합의 참여자 ${order} ${user.label} 삭제`}
                onClick={() =>
                  onRemoveApprovalUser(stageId, String(user.value))
                }
                sx={{ p: 0.25 }}
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        data-testid="document-reference-row"
        sx={{ ...labeledRowSx, alignItems: 'center' }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          참조
        </Typography>
        <Box sx={{ minWidth: 0 }}>
          <UserSelectEditor
            value={referenceUserIds}
            options={userOptions}
            multiple
            label="참조자 선택"
            onChange={onReferenceUserChange}
            hideSelectedOptions
            preserveSelectionOrder
          />
        </Box>
      </Box>
    </Box>
  );
}
