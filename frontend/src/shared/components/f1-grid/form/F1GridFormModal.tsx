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
import { useTheme } from '@mui/material/styles';
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
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
}: F1GridFormModalProps<T>) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();
  const descriptionId = useId();
  const fieldRefs = useRef(new Map<string, HTMLDivElement>());
  const [draftRow, setDraftRow] = useState<T>(() => ({ ...row }));
  const [previousOpen, setPreviousOpen] = useState(open);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [focusRequest, setFocusRequest] = useState<{ field: string }>();

  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) {
      setDraftRow({ ...row });
      setValidationErrors({});
      setFocusRequest(undefined);
    }
  }

  useEffect(() => {
    if (!focusRequest) return;

    const field = fieldRefs.current.get(focusRequest.field);
    const input = field?.querySelector<HTMLElement>(
      'input, textarea, [role="combobox"]',
    );
    input?.focus();
  }, [focusRequest]);

  const sections = buildGridFormSections(columns);
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
  const defaultDescription =
    mode === 'edit' &&
    descriptionRow[rowKey] !== undefined &&
    descriptionRow[rowKey] !== null
      ? `대상: ${String(descriptionRow[rowKey])}`
      : undefined;
  const description = plugin.getDescription?.(context) ?? defaultDescription;

  const patchDraft = (patch: Partial<T>) => {
    setDraftRow((current) => ({ ...current, ...patch }));
    const patchedFields = Object.keys(patch);
    if (patchedFields.length === 0) return;
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

  return (
    <Dialog
      open={open}
      onClose={onCancel}
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
            display: 'flex',
            flexDirection: 'column',
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
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" id={titleId} variant="h6">
            {title}
          </Typography>
          {description && (
            <Typography
              id={descriptionId}
              color="text.secondary"
              variant="body2"
            >
              {description}
            </Typography>
          )}
        </Box>
        <Tooltip title="닫기">
          <IconButton aria-label="닫기" edge="end" onClick={onCancel}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      <DialogContent
        data-testid="f1-grid-form-content"
        style={{ overflowY: 'auto' }}
        sx={{ bgcolor: 'background.default', py: 2.5 }}
      >
        <Box
          data-testid="f1-grid-form-grid"
          style={{ display: 'grid' }}
          sx={{
            gap: 2,
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
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
                borderLeft: 3,
                borderLeftColor: 'primary.main',
                borderRadius: '6px',
                display: 'grid',
                gap: 2,
                gridColumn: '1 / -1',
                gridTemplateColumns: 'subgrid',
                p: 2,
              }}
            >
              <Typography
                component="h3"
                sx={{ gridColumn: '1 / -1' }}
                variant="subtitle2"
              >
                {section.group}
              </Typography>
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
          borderColor: 'divider',
          borderTop: 1,
          flexShrink: 0,
          gap: 1,
          justifyContent: 'space-between',
          px: 3,
          py: 1.5,
        }}
      >
        <Typography color="text.secondary" variant="caption">
          적용 후 화면의 저장 버튼으로 최종 저장됩니다.
        </Typography>
        <Box sx={{ display: 'flex', flexShrink: 0, gap: 1 }}>
          <Button onClick={onCancel}>취소</Button>
          <Button variant="contained" onClick={applyDraft}>
            적용
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
