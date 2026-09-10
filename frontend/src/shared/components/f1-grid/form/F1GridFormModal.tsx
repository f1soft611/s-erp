import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, SyntheticEvent } from 'react';
import type {
  F1GridColumn,
  F1GridFormMode,
  F1GridRowFormPlugin,
} from '../types/grid.types';
import { validateGridRow } from '../validation/GridValidation';
import { GridFormField } from './GridFormField';
import {
  buildGridFormSections,
  isGridFormFieldReadOnly,
} from './GridFormModel';

export type F1GridFormModalProps<T extends object> = {
  open: boolean;
  mode: F1GridFormMode;
  row: T;
  originalRow?: T;
  columns: F1GridColumn<T>[];
  rowKey: keyof T;
  plugin: F1GridRowFormPlugin<T>;
  externalErrors?: Record<string, string>;
  onCancel: () => void;
  onApply: (draftRow: T) => void;
  onDraftChange?: (fields: string[]) => void;
};

export function F1GridFormModal<T extends object>({
  open,
  mode,
  row,
  originalRow,
  columns,
  rowKey,
  plugin,
  externalErrors = {},
  onCancel,
  onApply,
  onDraftChange,
}: F1GridFormModalProps<T>) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();
  const descriptionId = useId();
  const fieldRefs = useRef(new Map<string, HTMLDivElement>());
  const [draftRow, setDraftRow] = useState<T>(() => ({ ...row }));
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [focusRequest, setFocusRequest] = useState<{ field: string }>();

  useEffect(() => {
    if (!open) return;

    setDraftRow({ ...row });
    setValidationErrors({});
    setFocusRequest(undefined);
  }, [open, row]);

  useEffect(() => {
    if (!focusRequest) return;

    const field = fieldRefs.current.get(focusRequest.field);
    const input = field?.querySelector<HTMLElement>(
      'input, textarea, [role="combobox"]',
    );
    input?.focus();
  }, [focusRequest]);

  const sections = buildGridFormSections(columns, draftRow);
  const includedColumns = sections.flatMap((section) =>
    section.fields.map((field) => ({
      ...field.column,
      headerName: field.label,
    })),
  );
  const errors = { ...validationErrors, ...externalErrors };
  const context = { mode, row: draftRow };
  const title =
    plugin.getTitle?.(context) ??
    (mode === 'create' ? '신규 등록' : '정보 수정');
  const descriptionRow = originalRow ?? draftRow;
  const targetColumn = columns.find(
    (column) => column.form?.targetField !== undefined,
  );
  const targetField = (targetColumn?.form?.targetField ?? rowKey) as keyof T;
  const targetLabel = targetColumn?.form?.targetLabel ?? '대상';
  const targetValue = descriptionRow[targetField];
  const defaultDescription =
    mode === 'edit' && targetValue !== undefined && targetValue !== null
      ? `${targetLabel}: ${String(targetValue)}`
      : undefined;
  const description = plugin.getDescription?.(context) ?? defaultDescription;

  const patchDraft = (patch: Partial<T>) => {
    setDraftRow((current) => ({ ...current, ...patch }));
    const patchedFields = Object.keys(patch);
    if (patchedFields.length === 0) return;
    onDraftChange?.(patchedFields);
    setValidationErrors((current) => {
      const nextErrors = { ...current };
      patchedFields.forEach((field) => delete nextErrors[field]);
      return nextErrors;
    });
  };

  const applyDraft = () => {
    const nextValidationErrors = validateGridRow(draftRow, includedColumns);
    const nextErrors = { ...nextValidationErrors, ...externalErrors };
    const firstInvalidField = includedColumns
      .map((column) => String(column.field))
      .find((field) => Boolean(nextErrors[field]));

    setValidationErrors(nextValidationErrors);
    if (firstInvalidField) {
      setFocusRequest({ field: firstInvalidField });
      return;
    }

    const appliedDraft = { ...draftRow };
    const shouldContinue = plugin.onBeforeApply?.({
      mode,
      originalRow,
      draftRow: appliedDraft,
    });
    if (shouldContinue === false) return;

    onApply(appliedDraft);
  };

  const stopGridEventPropagation = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      onContextMenu={stopGridEventPropagation}
      onCopy={stopGridEventPropagation}
      onKeyDown={stopGridEventPropagation}
      onPaste={stopGridEventPropagation}
      fullScreen={fullScreen}
      fullWidth
      maxWidth={false}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      slotProps={{
        paper: {
          style: {
            maxWidth: fullScreen ? undefined : '960px',
            maxHeight: fullScreen ? undefined : '85vh',
          },
          sx: {
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            boxShadow: '0 18px 50px rgba(15, 23, 42, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            width: '100%',
          },
        },
      }}
    >
      <DialogTitle
        component="div"
        id={`${titleId}-container`}
        sx={{
          alignItems: 'flex-start',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          flexShrink: 0,
          gap: 2,
          justifyContent: 'space-between',
          px: 2,
          py: 1.75,
        }}
      >
        <Box sx={{ minWidth: 0, width: '100%' }}>
          <Typography
            component="h2"
            id={titleId}
            sx={{
              color: 'text.primary',
              fontSize: { xs: '1.1rem', sm: '1.4rem' },
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
            }}
            variant="h6"
          >
            {title}
          </Typography>
          {description && (
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                border: 1,
                borderColor: alpha(theme.palette.primary.main, 0.12),
                borderLeft: 2,
                borderLeftColor: 'primary.main',
                borderRadius: 1,
                display: 'flex',
                mt: 1.25,
                px: 1.25,
                py: 0.75,
                width: '100%',
              }}
            >
              <Typography
                id={descriptionId}
                color="text.primary"
                sx={{
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
                variant="body2"
              >
                {description}
              </Typography>
            </Box>
          )}
        </Box>
        <Tooltip title="닫기">
          <IconButton
            aria-label="닫기"
            edge="end"
            onClick={onCancel}
            sx={{
              bgcolor: 'action.hover',
              borderRadius: '10px',
              color: 'text.secondary',
              height: 40,
              width: 40,
              '&:hover': {
                bgcolor: 'action.selected',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      <DialogContent
        data-testid="f1-grid-form-content"
        style={{ overflowY: 'auto' }}
        sx={{
          bgcolor: 'background.default',
          backgroundImage:
            'linear-gradient(180deg, rgba(148, 163, 184, 0.05) 0%, rgba(148, 163, 184, 0) 120px)',
          px: 3,
          pt: 1.5,
          pb: 1.5,
        }}
      >
        <Box
          data-testid="f1-grid-form-grid"
          style={{ display: 'grid' }}
          sx={{
            gap: 1.5,
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            mt: 1,
          }}
        >
          {sections.map((section) => (
            <Box
              component="section"
              key={section.group}
              sx={{
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                borderLeft: 2,
                borderLeftColor: 'primary.main',
                borderRadius: '10px',
                boxShadow: '0 1px 0 rgba(15, 23, 42, 0.03)',
                display: 'grid',
                gap: 1.15,
                gridColumn: '1 / -1',
                gridTemplateColumns: 'subgrid',
                p: 1.5,
              }}
            >
              <Box
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  gridColumn: '1 / -1',
                  pb: 0.75,
                }}
              >
                <Typography
                  component="h3"
                  sx={{
                    color: 'text.primary',
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                  }}
                  variant="subtitle2"
                >
                  {section.group}
                </Typography>
              </Box>
              {section.fields.map((field) => {
                const fieldName = String(field.field);
                const smSpan = Math.min(field.span, 2);
                const fieldStyle = {
                  '--f1-form-span-xs': 1,
                  '--f1-form-span-sm': smSpan,
                  '--f1-form-span-lg': field.span,
                } as CSSProperties;
                const renderColumn = {
                  ...field.column,
                  headerName: field.label,
                };

                return (
                  <Box
                    data-testid={`f1-grid-form-field-${fieldName}`}
                    data-form-field="true"
                    data-field={fieldName}
                    key={fieldName}
                    ref={(element: HTMLDivElement | null) => {
                      if (element) fieldRefs.current.set(fieldName, element);
                      else fieldRefs.current.delete(fieldName);
                    }}
                    id={`f1-grid-form-field-${fieldName}`}
                    style={fieldStyle}
                    sx={{
                      gridColumn: {
                        xs: 'span var(--f1-form-span-xs)',
                        sm: 'span var(--f1-form-span-sm)',
                        lg: 'span var(--f1-form-span-lg)',
                      },
                      minWidth: 0,
                    }}
                  >
                    <GridFormField
                      column={renderColumn}
                      row={draftRow}
                      mode={mode}
                      value={draftRow[field.field]}
                      readOnly={isGridFormFieldReadOnly(
                        field.column,
                        draftRow,
                        mode,
                      )}
                      error={errors[fieldName]}
                      onPatch={patchDraft}
                    />
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          alignItems: 'center',
          bgcolor: 'background.paper',
          borderColor: 'divider',
          borderTop: 1,
          flexShrink: 0,
          gap: 1,
          justifyContent: 'space-between',
          px: 3,
          py: 1.5,
        }}
      >
        <Typography
          color="text.secondary"
          sx={{ fontSize: '0.78rem', fontWeight: 500 }}
          variant="caption"
        >
          적용 후 화면의 저장 버튼으로 최종 저장됩니다.
        </Typography>
        <Box sx={{ display: 'flex', flexShrink: 0, gap: 1 }}>
          <Button
            onClick={applyDraft}
            sx={{
              borderRadius: 1.5,
              fontWeight: 700,
              minWidth: 96,
              px: 2.5,
            }}
            variant="contained"
          >
            적용
          </Button>
          <Button
            onClick={onCancel}
            sx={{
              borderRadius: 1.5,
              fontWeight: 600,
              px: 2,
            }}
          >
            취소
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
