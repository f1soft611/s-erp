import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
import { useMemo, useRef, useState } from 'react';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import {
  UserSelectEditor,
  type F1GridUserValue,
} from '../../../../../shared/components/f1-grid/editing/UserSelectEditor';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';
import type { DocumentApprovalStage } from '../types/documentWrite.types';

type DocumentApprovalSettingsDialogProps = {
  open: boolean;
  userOptions: F1GridUserOption[];
  userOptionsError?: string;
  approvalStages: DocumentApprovalStage[];
  referenceUserIds: string[];
  onClose: () => void;
  onApply: (
    approvalStages: DocumentApprovalStage[],
    referenceUserIds: string[],
  ) => void;
};

function cloneStages(stages: DocumentApprovalStage[]): DocumentApprovalStage[] {
  return stages.map((stage) => ({ ...stage, users: [...stage.users] }));
}

function toUserIds(value: F1GridUserValue): string[] {
  if (Array.isArray(value)) return [...new Set(value.map(String))];
  return value == null ? [] : [String(value)];
}

function getStageName(stage: DocumentApprovalStage, index: number): string {
  const kind = stage.kind === 'approval' ? '결재' : '합의';
  return `${kind} ${index + 1}`;
}

export function DocumentApprovalSettingsDialog({
  open,
  userOptions,
  userOptionsError,
  approvalStages,
  referenceUserIds,
  onClose,
  onApply,
}: DocumentApprovalSettingsDialogProps) {
  const [draftStages, setDraftStages] = useState<DocumentApprovalStage[]>(() =>
    cloneStages(approvalStages),
  );
  const [draftReferenceUserIds, setDraftReferenceUserIds] = useState<string[]>(
    () => [...referenceUserIds],
  );
  const [selectedApprovalUserIds, setSelectedApprovalUserIds] = useState<
    string[]
  >([]);
  const draggedStageId = useRef<number | null>(null);
  const nextStageId = useRef(
    approvalStages.reduce((nextId, stage) => Math.max(nextId, stage.id + 1), 1),
  );

  const assignedUserIds = useMemo(
    () =>
      new Set(
        draftStages.flatMap((stage) =>
          stage.users.map((user) => String(user.value)),
        ),
      ),
    [draftStages],
  );
  const selectedApprovalIds = useMemo(
    () => new Set(selectedApprovalUserIds),
    [selectedApprovalUserIds],
  );
  const referenceIds = useMemo(
    () => new Set(draftReferenceUserIds),
    [draftReferenceUserIds],
  );
  const approvalOptions = userOptions.filter((user) => {
    const id = String(user.value);
    return (
      !assignedUserIds.has(id) &&
      (!referenceIds.has(id) || selectedApprovalIds.has(id))
    );
  });
  const referenceOptions = userOptions.filter((user) => {
    const id = String(user.value);
    return (
      !assignedUserIds.has(id) &&
      (!selectedApprovalIds.has(id) || referenceIds.has(id))
    );
  });
  const selectedApprovalUsers = selectedApprovalUserIds.flatMap((id) => {
    const user = userOptions.find(
      (option) => String(option.value) === id,
    );
    return user ? [user] : [];
  });
  const userOptionsUnavailable = Boolean(userOptionsError) || userOptions.length === 0;

  const updateApprovalSelection = (value: F1GridUserValue) => {
    setSelectedApprovalUserIds(
      toUserIds(value).filter(
        (id) => !assignedUserIds.has(id) && !referenceIds.has(id),
      ),
    );
  };

  const updateReferences = (value: F1GridUserValue) => {
    setDraftReferenceUserIds(
      toUserIds(value).filter(
        (id) => !assignedUserIds.has(id) && !selectedApprovalIds.has(id),
      ),
    );
  };

  const addApproval = (kind: DocumentApprovalStage['kind']) => {
    const eligibleUsers = selectedApprovalUsers.filter(
      (user) =>
        !assignedUserIds.has(String(user.value)) &&
        !referenceIds.has(String(user.value)),
    );
    if (eligibleUsers.length === 0) return;

    if (kind === 'approval') {
      setDraftStages((current) => [
        ...current,
        ...eligibleUsers.map((user) => ({
          id: nextStageId.current++,
          kind: 'approval' as const,
          users: [user],
        })),
      ]);
    } else {
      setDraftStages((current) => [
        ...current,
        {
          id: nextStageId.current++,
          kind: 'agreement',
          users: eligibleUsers,
        },
      ]);
    }
    setSelectedApprovalUserIds([]);
  };

  const removeParticipant = (stageId: number, userId: string) => {
    setDraftStages((current) =>
      current.flatMap((stage) => {
        if (stage.id !== stageId || stage.isFixed) return [stage];
        const users = stage.users.filter(
          (user) => String(user.value) !== userId,
        );
        return users.length > 0 ? [{ ...stage, users }] : [];
      }),
    );
  };

  const moveStage = (sourceId: number, targetId: number) => {
    setDraftStages((current) => {
      const sourceIndex = current.findIndex((stage) => stage.id === sourceId);
      const targetIndex = current.findIndex((stage) => stage.id === targetId);
      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        sourceIndex === targetIndex ||
        current[sourceIndex].isFixed ||
        current[targetIndex].isFixed
      ) {
        return current;
      }

      const next = [...current];
      const [stage] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, stage);
      return next;
    });
  };

  const handleMove = (stageId: number, direction: -1 | 1) => {
    setDraftStages((current) => {
      const index = current.findIndex((stage) => stage.id === stageId);
      const target = current[index + direction];
      if (index < 0 || !target || current[index].isFixed || target.isFixed) {
        return current;
      }

      const next = [...current];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
  };

  const handleDragStart = (
    stageId: number,
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    draggedStageId.current = stageId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(stageId));
  };

  const handleDrop = (
    targetId: number,
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    const transferredId = event.dataTransfer.getData('text/plain');
    const sourceId = transferredId
      ? Number(transferredId)
      : draggedStageId.current;
    if (sourceId !== null && Number.isFinite(sourceId)) {
      moveStage(sourceId, targetId);
    }
    draggedStageId.current = null;
  };

  const handleApply = () => {
    onApply(cloneStages(draftStages), [...draftReferenceUserIds]);
    onClose();
  };

  return (
    <CommonDialog
      open={open}
      onClose={onClose}
      title="결재선 설정"
      description="현재 작성 중인 결재선과 참조선을 편집합니다."
      size="md"
      fullScreenOnMobile
      actions={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="contained" onClick={handleApply}>
            적용
          </Button>
        </>
      }
      dialogProps={{ 'data-testid': 'document-approval-settings-dialog' }}
    >
      <Box
        data-testid="document-approval-settings-content"
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}
      >
        {userOptionsError && (
          <Alert severity="error">{userOptionsError}</Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            결재 단계
          </Typography>
          <Typography variant="caption" color="text.secondary">
            드래그하거나 이동 버튼으로 순서를 변경할 수 있습니다.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {draftStages.map((stage, index) => {
              const stageName = getStageName(stage, index);
              const userNames = stage.users.map((user) => user.label);
              const description =
                stage.kind === 'approval'
                  ? userNames[0]
                  : `${userNames.join(', ')}`;
              return (
                <Box
                  key={stage.id}
                  role="group"
                  aria-label={`${stageName} ${description}`}
                  data-testid="document-approval-settings-stage"
                  draggable={!stage.isFixed}
                  onDragStart={(event) => handleDragStart(stage.id, event)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(stage.id, event)}
                  sx={{
                    alignItems: 'center',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    gap: 1,
                    minWidth: 0,
                    p: 1,
                  }}
                >
                  <DragIndicatorIcon
                    aria-hidden="true"
                    color={stage.isFixed ? 'disabled' : 'action'}
                    fontSize="small"
                  />
                  <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      {stageName}
                      {stage.isFixed ? ' · 변경 불가' : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {stage.users.map((user) => (
                        <Chip
                          key={String(user.value)}
                          label={user.label}
                          size="small"
                          onDelete={
                            stage.isFixed
                              ? undefined
                              : () =>
                                  removeParticipant(
                                    stage.id,
                                    String(user.value),
                                  )
                          }
                          deleteIcon={
                            stage.isFixed ? undefined : <CloseIcon />
                          }
                        />
                      ))}
                    </Box>
                  </Box>
                  {!stage.isFixed && (
                    <Box sx={{ display: 'flex', flex: '0 0 auto' }}>
                      <IconButton
                        size="small"
                        aria-label={`${stageName} 위로 이동`}
                        disabled={index <= 1}
                        onClick={() => handleMove(stage.id, -1)}
                      >
                        <KeyboardArrowUpIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label={`${stageName} 아래로 이동`}
                        disabled={index >= draftStages.length - 1}
                        onClick={() => handleMove(stage.id, 1)}
                      >
                        <KeyboardArrowDownIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            결재자 및 합의자 변경
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
            <Box sx={{ flex: '1 1 240px', minWidth: 0 }}>
              <UserSelectEditor
                value={selectedApprovalUserIds}
                options={approvalOptions}
                multiple
                hideSelectedOptions
                preserveSelectionOrder
                label="결재선 사용자 선택"
                readOnly={userOptionsUnavailable}
                onChange={updateApprovalSelection}
              />
            </Box>
            <Button
              variant="outlined"
              disabled={
                userOptionsUnavailable || selectedApprovalUserIds.length === 0
              }
              onClick={() => addApproval('approval')}
            >
              결재 추가
            </Button>
            <Button
              variant="outlined"
              disabled={
                userOptionsUnavailable || selectedApprovalUserIds.length === 0
              }
              onClick={() => addApproval('agreement')}
            >
              합의 추가
            </Button>
          </Box>
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            참조
          </Typography>
          <UserSelectEditor
            value={draftReferenceUserIds}
            options={referenceOptions}
            multiple
            hideSelectedOptions
            preserveSelectionOrder
            label="참조자 선택"
            readOnly={userOptionsUnavailable}
            onChange={updateReferences}
          />
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            자주 쓰는 결재선
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="outlined"
              disabled
              aria-label="자주 쓰는 결재선 저장"
            >
              자주 쓰는 결재선 저장
            </Button>
            <Button
              variant="outlined"
              disabled
              aria-label="자주 쓰는 결재선 불러오기"
            >
              자주 쓰는 결재선 불러오기
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            저장 테이블/API 준비 후 제공
          </Typography>
        </Box>
      </Box>
    </CommonDialog>
  );
}
