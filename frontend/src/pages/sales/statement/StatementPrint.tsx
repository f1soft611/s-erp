import { createPortal } from 'react-dom';
import PrintIcon from '@mui/icons-material/Print';
import { Box, Button } from '@mui/material';
import { CommonDialog } from '../../../shared/components/CommonDialog';
import type { StatementDetail, StatementItem } from './types';
import './statement-print.css';

const ROWS_PER_PAGE = 12;
const text = (value: string | null | undefined) => value || '-';
const amount = (value: number) => Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const rowLines = (row: StatementDetail) =>
  Math.max(1, Math.ceil(`${text(row.materialName)} [${text(row.materialSpec)}] ${text(row.materialCode)}`.length / 25));

function amountInKorean(value: number): string {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) return '';
  if (number === 0) return '영원 정';
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const units = ['', '십', '백', '천'];
  const groups = ['', '만', '억', '조'];
  let rest = Math.abs(number);
  let result = '';
  for (let group = 0; rest > 0; group += 1) {
    let part = rest % 10000;
    rest = Math.floor(rest / 10000);
    let word = '';
    for (let place = 0; part > 0; place += 1) {
      const digit = part % 10;
      part = Math.floor(part / 10);
      if (digit) word = (digit === 1 && place > 0 ? '' : digits[digit]) + units[place] + word;
    }
    if (word) result = word + groups[group] + result;
  }
  return `${number < 0 ? '마이너스 ' : ''}${result}원 정`;
}

function PrintCopy({ item, rows }: { item: StatementItem; rows: StatementDetail[] }) {
  const supply = item.details.reduce((sum, row) => sum + Number(row.supplyAmt), 0);
  const vat = item.details.reduce((sum, row) => sum + Number(row.vatAmt), 0);
  const quantity = item.details.reduce((sum, row) => sum + Number(row.deliveryQty), 0);
  return <section className="statement-print-copy">
    <div className="statement-print-heading">
      <div className="statement-print-recipient">
        <h1>거래명세서</h1>
        <div className="statement-print-recipient-box">
          <strong>{text(item.customerName)} 귀중</strong>
          <span>{text(item.customerAddress)}</span>
          <span>{text(item.customerPostCode)} / 전화 {text(item.customerTelephoneNo)} / 팩스 {text(item.customerFacsimileNo)}</span>
        </div>
      </div>
      <table className="statement-print-supplier"><tbody>
        <tr><th>일련번호</th><td>{item.statementNo}<br />{item.statementDt}</td><th>TEL</th><td>{text(item.supplierTelephoneNo)}</td></tr>
        <tr><th>사업자번호</th><td>{text(item.supplierBusinessNo)}</td><th>성명</th>
          <td className="statement-print-sign">{text(item.supplierPresidentName)}
            {item.supplierStampImage && <img src={item.supplierStampImage} alt="회사 직인" />}</td></tr>
        <tr><th>상호</th><td colSpan={3}>{text(item.supplierName)}</td></tr>
        <tr><th>주소</th><td colSpan={3}>{text(item.supplierAddress)} ({text(item.supplierPostCode)})</td></tr>
        <tr><th>업태 / 업종</th><td colSpan={3}>{text(item.supplierBusinessCategory)} / {text(item.supplierBusinessType)}　팩스 {text(item.supplierFacsimileNo)}</td></tr>
      </tbody></table>
    </div>
    <div className="statement-print-total"><strong>금 액</strong><span>{amountInKorean(item.totalAmt)}</span><strong>₩{amount(item.totalAmt)}</strong></div>
    <table className="statement-print-items">
      <thead><tr><th>일자</th><th>품목명 [규격]</th><th>수량 (단위)</th><th>단가</th><th>공급가액</th><th>부가세</th></tr></thead>
      <tbody>
        {rows.map((row) => <tr key={row.salesStatementDetailId}>
          <td>{item.deliveryDt.slice(5).replace('-', '/')}</td>
          <td>{text(row.materialName)} [{text(row.materialSpec)}] <span>{text(row.materialCode)}</span></td>
          <td className="number">{amount(row.deliveryQty)} {text(row.unit)}</td><td className="number">{amount(row.unitPrice)}</td>
          <td className="number">{amount(row.supplyAmt)}</td><td className="number">{amount(row.vatAmt)}</td>
        </tr>)}
        {Array.from({ length: Math.max(0, ROWS_PER_PAGE - rows.reduce((sum, row) => sum + rowLines(row), 0)) }, (_, index) => <tr key={`empty-${index}`} aria-hidden="true">
          <td>&nbsp;</td><td /><td /><td /><td /><td />
        </tr>)}
      </tbody>
    </table>
    <table className="statement-print-summary"><tbody><tr>
      <th>수량</th><td>{amount(quantity)}</td><th>공급가액</th><td>{amount(supply)}</td>
      <th>VAT</th><td>{amount(vat)}</td><th>합계</th><td>{amount(item.totalAmt)}</td><th>인수</th><td>인</td>
    </tr></tbody></table>
    {item.remark && <div className="statement-print-remark">비고: {item.remark}</div>}
  </section>;
}

function PrintSheet({ item }: { item: StatementItem }) {
  const pages: StatementDetail[][] = [[]];
  let used = 0;
  for (const row of item.details) {
    const lines = rowLines(row);
    if (used && used + lines > ROWS_PER_PAGE) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(row);
    used += lines;
  }
  return <div className="statement-print-sheet">{pages.map((rows, index) =>
    <article className="statement-print-page" key={index}>
      <PrintCopy item={item} rows={rows} />
      <div className="statement-print-cut" />
      <PrintCopy item={item} rows={rows} />
    </article>,
  )}</div>;
}

export function StatementPrint({ item, onClose }: { item: StatementItem; onClose: () => void }) {
  return <>
    <CommonDialog open title="거래명세표 미리보기" onClose={onClose} size="lg" fullScreenOnMobile
      actions={<><Button startIcon={<PrintIcon />} variant="contained" onClick={() => window.print()}>인쇄</Button>
        <Button onClick={onClose}>닫기</Button></>}>
      <Box sx={{ overflowX: 'auto', bgcolor: '#eee', p: 2 }}>
        <div className="statement-print-preview"><PrintSheet item={item} /></div>
      </Box>
    </CommonDialog>
    {createPortal(<div className="statement-print-host"><PrintSheet item={item} /></div>, document.body)}
  </>;
}
