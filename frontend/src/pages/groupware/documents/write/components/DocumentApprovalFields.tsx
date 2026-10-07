import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { Avatar, Box, Button, IconButton, Stack, Typography } from '@mui/material';
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
  onRemoveApprovalStage,
}: DocumentApprovalFieldsProps) {
  const assignedApprovalUserIds = new Set(
    approvalStages.flatMap((stage) =>
      stage.users.map((user) => String(user.value)),
    ),
  );
  const approvalOptions = userOptions.filter(
    (user) => !assignedApprovalUserIds.has(String(user.value)),
  );

  return (
    <Box
      data-testid="document-approval-fields"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        minWidth: 0,
        flexShrink: 0,
      }}
    >
      <Box
        data-testid="document-approval-row"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '64px minmax(0, 1fr)', sm: '80px minmax(0, 1fr)' },
          alignItems: 'center',
          gap: { xs: 1, sm: 1.5 },
          minWidth: 0,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          결재선
        </Typography>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Box
            data-testid="document-approval-stage-strip"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 0,
              overflowX: 'auto',
              overflowY: 'hidden',
              py: 0.25,
            }}
          >
            {approvalStages.map((stage, index) => (
              <Box
                key={stage.id}
                role="group"
                aria-label={`${stage.kind === 'approval' ? '결재' : '합의'} 단계 ${index + 1}`}
                data-testid="document-approval-stage"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flex: '0 0 auto',
                  height: 40,
                  boxSizing: 'border-box',
                  px: 0.75,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Stack spacing={0.25} sx={{ flex: '0 0 auto' }}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, lineHeight: 1.2 }}
                  >
                    {index + 1}. {stage.kind === 'approval' ? '결재' : '합의'}
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center' }}
                >
                  {stage.users.map((user) => (
                    <Stack
                      key={String(user.value)}
                      direction="row"
                      spacing={0.75}
                      sx={{ alignItems: 'center', minWidth: 0 }}
                    >
                      <Avatar
                        src={user.avatarUrl ?? undefined}
                        alt={`${user.label} 프로필`}
                        sx={{ width: 30, height: 30, flex: '0 0 auto' }}
                      >
                        {user.label.charAt(0)}
                      </Avatar>
                      <Stack spacing={0.1} sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ fontWeight: 600, maxWidth: 120 }}
                        >
                          {user.label}
                        </Typography>
                        {user.departmentName && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ maxWidth: 120 }}
                          >
                            {user.departmentName}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  ))}
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
            <Box
              data-testid="document-approval-active-field"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                flex: '0 0 390px',
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  flex: '1 1 auto',
                  minWidth: 180,
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
                  label={`결재선 ${approvalStages.length + 1} 사용자 선택`}
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
        </Stack>
      </Box>

      <Box
        data-testid="document-reference-row"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '64px minmax(0, 1fr)', sm: '80px minmax(0, 1fr)' },
          alignItems: 'center',
          gap: { xs: 1, sm: 1.5 },
          minWidth: 0,
        }}
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
