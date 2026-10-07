import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { Fragment } from 'react';
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
        <Box
          data-testid="document-approval-stage-strip"
          sx={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 1,
            minWidth: 0,
            overflowX: 'auto',
            overflowY: 'hidden',
            pb: approvalStages.length > 0 ? 0.5 : 0,
          }}
        >
          {approvalStages.map((stage, index) => (
            <Fragment key={stage.id}>
              {index > 0 && (
                <Typography
                  aria-hidden="true"
                  sx={{
                    alignSelf: 'center',
                    color: 'text.secondary',
                    flex: '0 0 auto',
                    fontWeight: 700,
                  }}
                >
                  &gt;
                </Typography>
              )}
              <Box
                data-testid="document-approval-stage"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flex: '0 0 300px',
                  minWidth: 0,
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      결재선 {index + 1}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {stage.kind === 'approval' ? '결재' : '합의'} {index + 1}
                    </Typography>
                  </Stack>
                  <UserSelectEditor
                    value={stage.users.map((user) => String(user.value))}
                    options={userOptions}
                    multiple
                    preserveSelectionOrder
                    readOnly
                    label={`결재선 ${index + 1}`}
                    onChange={() => undefined}
                  />
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
            </Fragment>
          ))}
          {approvalStages.length > 0 && (
            <Typography
              aria-hidden="true"
              sx={{
                alignSelf: 'center',
                color: 'text.secondary',
                flex: '0 0 auto',
                fontWeight: 700,
              }}
            >
              &gt;
            </Typography>
          )}
          <Box
            data-testid="document-approval-active-field"
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              alignItems: 'flex-start',
              gap: 1,
              flex: '0 0 400px',
              minWidth: 0,
              p: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
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
            <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
              <Button
                variant="outlined"
                size="small"
                disabled={selectedApprovalUserIds.length === 0}
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
          </Box>
        </Box>
        {approvalOptions.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            선택 가능한 사용자가 없습니다.
          </Typography>
        )}
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
          hideSelectedOptions
          preserveSelectionOrder
        />
        {userOptions.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            선택 가능한 사용자가 없습니다.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
