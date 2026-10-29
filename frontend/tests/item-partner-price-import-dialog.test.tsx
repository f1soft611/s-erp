import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ItemPartnerPriceImportDialog } from '../src/pages/co/master/item-partner-prices/components/ItemPartnerPriceImportDialog';

const mocks = vi.hoisted(() => ({
  parse: vi.fn(),
  validate: vi.fn(),
}));
vi.mock('../src/pages/co/master/item-partner-prices/services/itemPartnerPriceExcel.service', () => ({
  parseItemPartnerPriceWorkbook: mocks.parse,
  validateItemPartnerPriceImportRows: (rows: unknown[]) => rows,
}));
vi.mock('../src/pages/co/master/item-partner-prices/services/itemPartnerPrice.service', () => ({
  validateItemPartnerPriceImport: mocks.validate,
}));

const parsedRow = {
  sourceRowNumber: 2,
  tradeType: '매입',
  materialCode: '000101',
  customerCode: '000201',
  unitPrice: '1250.50',
  currency: 'KRW',
  startDt: '2026-10-01',
  endDt: null,
  moq: null,
  useAt: 'Y',
  errors: [],
};
const resolvedRow = {
  sourceRowNumber: 2,
  materialId: 101,
  materialCode: '000101',
  materialName: '원재료',
  customerId: 201,
  customerCode: '000201',
  customerName: '거래처',
  errors: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.parse.mockResolvedValue([parsedRow]);
});

function renderDialog(onStage = vi.fn()) {
  return {
    onStage,
    ...render(
      <ThemeProvider theme={createTheme()}>
        <ItemPartnerPriceImportDialog open onClose={vi.fn()} onStage={onStage} />
      </ThemeProvider>,
    ),
  };
}

describe('item partner price import dialog', () => {
  it('stages all preflight-valid rows only after confirmation', async () => {
    mocks.validate.mockResolvedValue({ rows: [resolvedRow] });
    const { onStage } = renderDialog();
    fireEvent.change(screen.getByLabelText('엑셀 파일 선택'), {
      target: { files: [new File(['xlsx'], 'prices.xlsx')] },
    });
    await screen.findByDisplayValue('000101');
    const stage = screen.getByRole('button', { name: '그리드에 추가' });
    expect(stage).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '검증' }));
    await waitFor(() => expect(stage).toBeEnabled());
    fireEvent.click(stage);
    expect(onStage).toHaveBeenCalledWith([
      expect.objectContaining({
        materialId: 101,
        customerId: 201,
        materialCode: '000101',
        customerCode: '000201',
        unitPrice: 1250.5,
      }),
    ]);
  });

  it('keeps server-invalid rows visible and prevents any partial stage', async () => {
    mocks.validate.mockResolvedValue({
      rows: [{ ...resolvedRow, errors: [{ code: 'ITEM_NOT_FOUND', message: '품목을 찾을 수 없습니다.' }] }],
    });
    const { onStage } = renderDialog();
    fireEvent.change(screen.getByLabelText('엑셀 파일 선택'), {
      target: { files: [new File(['xlsx'], 'prices.xlsx')] },
    });
    await screen.findByDisplayValue('000101');
    fireEvent.click(screen.getByRole('button', { name: '검증' }));
    expect(await screen.findByText('품목을 찾을 수 없습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '그리드에 추가' })).toBeDisabled();
    expect(onStage).not.toHaveBeenCalled();
  });
});
