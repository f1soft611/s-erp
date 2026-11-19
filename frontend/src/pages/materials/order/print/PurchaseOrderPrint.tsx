import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PrintIcon from '@mui/icons-material/Print';
import { Box, Button } from '@mui/material';
import { CommonDialog } from '../../../../shared/components/CommonDialog';
import { amountInKorean } from '../../../../shared/utils/amountInKorean';
import { vatLabel } from './services/purchaseOrderPrint.service';
import type { PurchaseOrderPrintData, PurchaseOrderPrintDetail } from './types/purchaseOrderPrint.types';
import './purchase-order-print.css';
import {
  paginateRows,
  rowLines,
  ROWS_PER_PAGE,
} from './purchaseOrderPrintLayout';

const text = (value: string | null | undefined) => (value && value.trim() ? value : '-');
const amount = (value: number | null | undefined) =>
  value == null ? '-' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const slashDate = (value: string | null | undefined) => (value ? value.replace(/-/g, '/') : '-');

function PrintPage({ data, rows }: { data: PurchaseOrderPrintData; rows: PurchaseOrderPrintDetail[] }) {
  const quantity = data.details.reduce((sum, row) => sum + Number(row.orderQty), 0);
  const korean = amountInKorean(Number(data.totalAmt));
  const used = rows.reduce((sum, row) => sum + rowLines(row), 0);
  return (
    <article className="order-print-page">
      <h1>발 주 서</h1>
      <div className="order-print-head">
        <table className="order-print-vendor"><tbody>
          <tr><th>일련번호</th><td>{data.orderNo}<br />{slashDate(data.orderDt)}</td></tr>
          <tr><th>수 신</th><td>{text(data.vendorName)}</td></tr>
          <tr><th>참 조</th><td>{text(data.vendorCharge)}</td></tr>
          <tr><th>TEL</th><td>{text(data.vendorTelephoneNo)}</td></tr>
          <tr><th>FAX</th><td>{text(data.vendorFacsimileNo)}</td></tr>
        </tbody></table>
        <table className="order-print-company"><tbody>
          <tr><td colSpan={2} className="order-print-logo">
            {data.companyLogoImage ? <img src={data.companyLogoImage} alt="회사 로고" /> : <strong>{text(data.companyName)}</strong>}
          </td></tr>
          <tr><th>사업자등록번호</th><td>{text(data.companyBusinessNo)}</td></tr>
          <tr><th>회사명/대표</th><td className="order-print-sign">
            {text(data.companyName)} / {text(data.companyPresidentName)}
            {data.companyStampImage && <img src={data.companyStampImage} alt="회사 직인" />}
          </td></tr>
          <tr><th>주 소</th><td>{text(data.companyAddress)}{data.companyPostCode ? ` (${data.companyPostCode})` : ''}</td></tr>
          <tr><th>담당/연락처</th><td>{text(data.ordererName)} / {text(data.ordererMobileNo)}</td></tr>
        </tbody></table>
      </div>
      <div className="order-print-total">
        <strong>금 액 : {korean || '-'}</strong>
        <span>(₩ {amount(data.totalAmt)}원) / {vatLabel(data.taxType, data.vatIncludedAt)}</span>
      </div>
      <table className="order-print-items">
        <thead><tr>
          <th>품목코드</th><th>품목명[규격]</th><th>수량(단위포함)</th><th>단가</th><th>공급가액</th><th>부가세</th><th>납기일</th>
        </tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row.lineNo}>
            <td>{text(row.materialCode)}</td>
            <td>{text(row.materialName)} [{text(row.materialSpec)}]</td>
            <td className="number">{amount(row.orderQty)}{row.unit ? ` ${row.unit}` : ''}</td>
            <td className="number">{amount(row.unitPrice)}</td>
            <td className="number">{amount(row.supplyAmt)}</td>
            <td className="number">{amount(row.vatAmt)}</td>
            <td className="center">{slashDate(row.deliveryDt)}</td>
          </tr>)}
          {Array.from({ length: Math.max(0, ROWS_PER_PAGE - used) }, (_, index) => <tr key={`empty-${index}`} aria-hidden="true">
            <td>&nbsp;</td><td /><td /><td /><td /><td /><td />
          </tr>)}
        </tbody>
      </table>
      <table className="order-print-summary"><tbody><tr>
        <th>수량</th><td>{amount(quantity)}</td><th>공급가액</th><td>{amount(data.supplyAmt)}</td>
        <th>VAT</th><td>{amount(data.vatAmt)}</td><th>합계</th><td>{amount(data.totalAmt)}</td>
      </tr></tbody></table>
      {data.remark && <div className="order-print-remark">비고: {data.remark}</div>}
    </article>
  );
}

function PrintSheet({ data }: { data: PurchaseOrderPrintData }) {
  return <div className="order-print-sheet">{paginateRows(data.details).map((rows, index) =>
    <PrintPage key={index} data={data} rows={rows} />)}</div>;
}

/**
 * 발주서 미리보기와 브라우저 인쇄. `인쇄`를 누르면 인쇄 대화상자를 열고 onPrint로 출력했음을 알린다.
 * (거래명세표 StatementPrint와 같은 방식이며 CSS 클래스는 발주서 전용이다.)
 */
export function PurchaseOrderPrint({ data, onClose, onPrint }: {
  data: PurchaseOrderPrintData;
  onClose: () => void;
  onPrint: () => void;
}) {
  // 발주서가 열려 있는 동안만 인쇄 전용 규칙을 켠다(CSS 설명 참고).
  useEffect(() => {
    document.body.classList.add('order-printing');
    return () => document.body.classList.remove('order-printing');
  }, []);

  const handlePrint = () => {
    window.print();
    onPrint();
  };
  return <>
    <CommonDialog open title="발주서 미리보기" onClose={onClose} size="lg" fullScreenOnMobile
      actions={<><Button startIcon={<PrintIcon />} variant="contained" onClick={handlePrint}>인쇄</Button>
        <Button onClick={onClose}>닫기</Button></>}>
      <Box sx={{ overflowX: 'auto', bgcolor: '#eee', p: 2 }}>
        <div className="order-print-preview"><PrintSheet data={data} /></div>
      </Box>
    </CommonDialog>
    {createPortal(<div className="order-print-host"><PrintSheet data={data} /></div>, document.body)}
  </>;
}
