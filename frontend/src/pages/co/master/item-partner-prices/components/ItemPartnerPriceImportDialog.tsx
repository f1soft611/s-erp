import { useMemo, useRef, useState } from 'react';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import {
  parseItemPartnerPriceWorkbook,
  validateItemPartnerPriceImportRows,
} from '../services/itemPartnerPriceExcel.service';
import { validateItemPartnerPriceImport } from '../services/itemPartnerPrice.service';
import type {
  ItemPartnerPriceImportRequestRow,
  ItemPartnerPriceImportRow,
  ItemPartnerPriceImportValidationRow,
  ItemPartnerPriceRow,
} from '../types/itemPartnerPrice.types';
import { emptyItemPartnerPricePayload } from '../types/itemPartnerPrice.types';

type Props = {
  open: boolean;
  onClose: () => void;
  onStage: (rows: ItemPartnerPriceRow[]) => void;
};

const editableColumns = [
  ['tradeType', '거래구분'],
  ['materialCode', '품목코드'],
  ['customerCode', '거래처코드'],
  ['unitPrice', '단가'],
  ['currency', '통화'],
  ['startDt', '적용 시작일'],
  ['endDt', '적용 종료일'],
  ['moq', '최소주문수량'],
  ['useAt', '사용여부'],
] as const;

function requestRows(rows: ItemPartnerPriceImportRow[]): ItemPartnerPriceImportRequestRow[] {
  return rows.map((row) => ({
    sourceRowNumber: row.sourceRowNumber,
    tradeType: row.tradeType,
    materialCode: row.materialCode,
    customerCode: row.customerCode,
    unitPrice: row.unitPrice,
    currency: row.currency,
    startDt: row.startDt,
    endDt: row.endDt,
    moq: row.moq,
    useAt: row.useAt,
  }));
}

export function ItemPartnerPriceImportDialog({ open, onClose, onStage }: Props) {
  if (!open) return null;
  return <OpenItemPartnerPriceImportDialog onClose={onClose} onStage={onStage} />;
}

function OpenItemPartnerPriceImportDialog({
  onClose,
  onStage,
}: Omit<Props, 'open'>) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ItemPartnerPriceImportRow[]>([]);
  const [serverRows, setServerRows] = useState<ItemPartnerPriceImportValidationRow[] | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const localErrorCount = useMemo(
    () => rows.reduce((count, row) => count + row.errors.length, 0),
    [rows],
  );
  const serverErrorCount = useMemo(
    () => serverRows?.reduce((count, row) => count + row.errors.length, 0) ?? 0,
    [serverRows],
  );
  const canStage = Boolean(rows.length && serverRows &&
    serverRows.length === rows.length && serverErrorCount === 0 && localErrorCount === 0);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setLoadingFile(true);
    setRows([]);
    setServerRows(null);
    setError('');
    try {
      setRows(await parseItemPartnerPriceWorkbook(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '엑셀 파일을 읽지 못했습니다.');
    } finally {
      setLoadingFile(false);
    }
  };

  const changeCell = (
    sourceRowNumber: number,
    field: (typeof editableColumns)[number][0],
    value: string,
  ) => {
    setRows((current) => validateItemPartnerPriceImportRows(current.map((row) => {
      if (row.sourceRowNumber !== sourceRowNumber) return row;
      if (field === 'endDt') return { ...row, endDt: value || null };
      if (field === 'moq') return { ...row, moq: value || null };
      return { ...row, [field]: value };
    })));
    setServerRows(null);
    setError('');
  };

  const verify = async () => {
    if (!rows.length) return;
    if (localErrorCount) {
      setError('표시된 셀 오류를 수정한 뒤 다시 검증해 주세요.');
      return;
    }
    setValidating(true);
    setServerRows(null);
    setError('');
    try {
      const result = await validateItemPartnerPriceImport(requestRows(rows));
      setServerRows(result.rows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '엑셀 단가 검증에 실패했습니다.');
    } finally {
      setValidating(false);
    }
  };

  const stage = () => {
    if (!canStage || !serverRows) return;
    const staged: ItemPartnerPriceRow[] = rows.map((row, index) => {
      const verified = serverRows[index];
      return {
        ...emptyItemPartnerPricePayload(),
        priceId: `new-price-${crypto.randomUUID()}`,
        materialId: verified.materialId!,
        materialCode: verified.materialCode!,
        materialName: verified.materialName!,
        customerId: verified.customerId!,
        customerCode: verified.customerCode!,
        customerName: verified.customerName!,
        tradeType: row.tradeType as ItemPartnerPriceRow['tradeType'],
        unitPrice: Number(row.unitPrice),
        currency: row.currency.trim() || 'KRW',
        startDt: row.startDt,
        endDt: row.endDt,
        moq: row.moq ? Number(row.moq) : null,
        useAt: row.useAt as ItemPartnerPriceRow['useAt'],
      };
    });
    onStage(staged);
  };

  const serverErrorsFor = (sourceRowNumber: number) =>
    serverRows?.find((row) => row.sourceRowNumber === sourceRowNumber)?.errors ?? [];

  return (
    <CommonDialog
      open
      onClose={onClose}
      title="엑셀 단가 등록"
      description="파일을 선택해 미리보기와 검증을 진행합니다. 기존 단가는 수정하지 않습니다."
      size="lg"
      fullScreenOnMobile
      actions={
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} disabled={validating}>취소</Button>
          <Button
            variant="outlined"
            onClick={() => void verify()}
            disabled={!rows.length || Boolean(localErrorCount) || loadingFile || validating}
          >
            {validating ? <CircularProgress size={18} /> : '검증'}
          </Button>
          <Button variant="contained" onClick={stage} disabled={!canStage}>
            그리드에 추가
          </Button>
        </Stack>
      }
    >
      <Stack spacing={1.5} sx={{ minWidth: 0 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'center' } }}
        >
          <Button
            variant="outlined"
            startIcon={<UploadFileOutlined />}
            onClick={() => fileInput.current?.click()}
            disabled={loadingFile || validating}
          >
            .xlsx 파일 선택
          </Button>
          <input
            ref={fileInput}
            hidden
            type="file"
            accept=".xlsx"
            aria-label="엑셀 파일 선택"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          {loadingFile && <CircularProgress size={20} aria-label="엑셀 파일 읽는 중" />}
          <Typography variant="caption" color="text.secondary">
            최대 10 MiB, 1,000행 · 코드 셀은 텍스트로 유지해 주세요.
          </Typography>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        {rows.length > 0 && (
          <Alert severity={localErrorCount || serverErrorCount ? 'warning' : 'info'}>
            {rows.length}행 · 입력 오류 {localErrorCount + serverErrorCount}건
            {serverRows && !serverErrorCount && !localErrorCount ? ' · 검증 완료' : ''}
          </Alert>
        )}
        {rows.length > 0 && (
          <TableContainer sx={{ maxHeight: { xs: '55vh', sm: 520 }, border: 1, borderColor: 'divider' }}>
            <Table size="small" stickyHeader sx={{ minWidth: 1120 }}>
              <TableHead>
                <TableRow>
                  <TableCell>원본 행</TableCell>
                  {editableColumns.map(([, label]) => <TableCell key={label}>{label}</TableCell>)}
                  <TableCell>검증 결과</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const errors = [...row.errors, ...serverErrorsFor(row.sourceRowNumber).map((item) => item.message)];
                  return (
                    <TableRow key={row.sourceRowNumber} hover>
                      <TableCell>{row.sourceRowNumber}</TableCell>
                      {editableColumns.map(([field, label]) => (
                        <TableCell key={field} sx={{ minWidth: 120 }}>
                          <TextField
                            size="small"
                            value={row[field] ?? ''}
                            aria-label={`${row.sourceRowNumber}행 ${label}`}
                            onChange={(event) => changeCell(
                              row.sourceRowNumber, field, event.target.value,
                            )}
                            error={row.errors.length > 0}
                          />
                        </TableCell>
                      ))}
                      <TableCell sx={{ minWidth: 260, whiteSpace: 'normal' }}>
                        {errors.length
                          ? <Typography color="error.main" variant="caption">{errors.join(' ')}</Typography>
                          : <Typography color="success.main" variant="caption">
                              {serverRows ? '정상' : '검증 대기'}
                            </Typography>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {rows.length === 0 && !loadingFile && !error && (
          <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
            .xlsx 파일을 선택하면 등록할 단가 행을 미리 볼 수 있습니다.
          </Box>
        )}
      </Stack>
    </CommonDialog>
  );
}
