import { Button, Typography } from '@mui/material';
import { CommonDialog } from './CommonDialog';

export type UnsavedChangesConfirmDialogAction = {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'text' | 'outlined' | 'contained';
  color?:
    | 'inherit'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'error'
    | 'info'
    | 'warning';
  disabled?: boolean;
  autoFocus?: boolean;
};

export type UnsavedChangesConfirmDialogProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  description?: string;
  cancelLabel?: string;
  continueLabel?: string;
  onCancel: () => void;
  onContinue: () => void;
  disableContinue?: boolean;
  confirmButtonColor?: 'primary' | 'warning' | 'error';
  dialogTitleId?: string;
  actions?: UnsavedChangesConfirmDialogAction[];
};

export function UnsavedChangesConfirmDialog({
  open,
  title = '저장하지 않은 변경사항',
  subtitle,
  description = '현재 변경사항을 유지하지 않고 계속하시겠습니까?',
  cancelLabel = '취소',
  continueLabel = '계속',
  onCancel,
  onContinue,
  disableContinue = false,
  confirmButtonColor = 'primary',
  dialogTitleId,
  actions,
}: UnsavedChangesConfirmDialogProps) {
  const actionItems: UnsavedChangesConfirmDialogAction[] =
    actions && actions.length > 0
      ? actions
      : [
          {
            label: continueLabel,
            onClick: onContinue,
            variant: 'contained',
            color: confirmButtonColor,
            disabled: disableContinue,
            autoFocus: true,
          },
          {
            label: cancelLabel,
            onClick: onCancel,
            variant: 'text',
            autoFocus: false,
          },
        ];

  return (
    <CommonDialog
      open={open}
      onClose={onCancel}
      titleId={dialogTitleId ?? 'unsaved-changes-dialog-title'}
      title={title}
      description={subtitle}
      size="xs"
      actions={actionItems.map((action) => (
        <Button
          key={action.label}
          variant={action.variant ?? 'text'}
          color={action.color ?? 'primary'}
          onClick={action.onClick}
          disabled={action.disabled}
          autoFocus={action.autoFocus}
        >
          {action.label}
        </Button>
      ))}
    >
      <Typography>{description}</Typography>
    </CommonDialog>
  );
}
