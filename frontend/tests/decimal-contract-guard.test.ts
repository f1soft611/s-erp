import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import contracts from '../src/shared/config/decimal-column-contract.json';
import golden from './fixtures/decimal-column-contract.golden.json';
import { getDecimalColumnContract } from '../src/shared/services/decimalColumnContract';

/**
 * 소수점 계약 가드레일 (docs/spec/20261126/20261126_001_공통_소수점_계약_가드레일_상세사양서.md)
 * 계약 JSON을 바꾸면 tests/fixtures/decimal-column-contract.golden.json도 같은 변경에서 갱신해야 한다.
 */

/** 계약 대상 문서와 그 문서를 화면에서 다루는 폴더. 새 모듈은 문서를 계약에 추가하면서 여기에 등록한다. */
const GUARD_SCOPE: Record<string, string[]> = {
  'sales.order': ['src/pages/sales/order'],
  'sales.quotation': ['src/pages/sales/quotation'],
  'sales.delivery': ['src/pages/sales/shipment/delivery', 'src/pages/sales/shipment/statement', 'src/pages/sales/revenue/closing'],
  'sales.deliveryPlan': ['src/pages/sales/shipment/deliveryplan'],
};

/**
 * 화면 코드에 직접 쓴 소수점 설정의 허용 목록. 표시·입력 규칙이 아니라 내부 계산용이거나 타입 선언인 경우만 사유와 함께 둔다.
 * 값은 "파일 경로: 사유"이며 해당 파일에서만 허용한다.
 */
const ALLOWED_DIRECT_SETTINGS: Record<string, string> = {
  'src/pages/sales/order/create/data/salesOrderAmounts.ts': '규칙 타입 선언과 정책 범위 검증용 내부 계산',
  'src/pages/sales/order/create/data/salesOrderDetail.ts': '정책 규칙에 없는 trailingZeros의 기본 보정',
  'src/pages/sales/quotation/create/data/quotationDetail.ts': '정책 규칙에 없는 trailingZeros의 기본 보정',
  'src/pages/sales/shipment/delivery/create/services/salesDelivery.service.ts': '정책 규칙에 없는 trailingZeros의 기본 보정',
  'src/pages/sales/shipment/deliveryplan/components/DeliveryPlanForm.tsx': '계획수량 합산의 내부 정밀도(6자리)',
  'src/pages/sales/shipment/deliveryplan/create/SalesDeliveryPlanCreatePage.tsx': '계획 잔량 계산의 내부 정밀도(6자리)',
  'src/pages/sales/shipment/statement/data/statementPrint.ts': '인쇄 합계의 내부 정밀도(6자리)',
};

const DIRECT_SETTING = /decimalPlaces|\bdecimal:\s*\{|\bplaces:\s*\d|\brounding:\s*'|\btrailingZeros:\s*'|\?\?\s*'(?:FIXED|AUTO)'/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(path, 'utf8');
const rel = (path: string) => relative(root, path).split(sep).join('/');

describe('decimal column contract guard', () => {
  it('keeps every contract document and column valid', () => {
    for (const document of Object.keys(contracts)) {
      expect(() => getDecimalColumnContract(document), document).not.toThrow();
    }
  });

  it('matches the golden contract so every change shows up in review', () => {
    expect(contracts).toEqual(golden);
  });

  it('registers every contract document with the folders that must follow it', () => {
    expect(Object.keys(GUARD_SCOPE).sort()).toEqual(Object.keys(contracts).sort());
    for (const folders of Object.values(GUARD_SCOPE)) {
      for (const folder of folders) expect(() => statSync(join(root, folder)), folder).not.toThrow();
    }
  });

  it('uses every contract field somewhere in its screens', () => {
    for (const [document, fields] of Object.entries(contracts)) {
      const source = GUARD_SCOPE[document].flatMap((folder) => sourceFiles(join(root, folder))).map(read).join('\n');
      for (const field of Object.keys(fields)) {
        expect(new RegExp(`\\b${field}\\b`).test(source), `${document}.${field}가 화면 코드에서 쓰이지 않습니다.`).toBe(true);
      }
    }
  });

  it('does not set decimal places, rounding or trailing zeros directly in contract screens', () => {
    const violations: string[] = [];
    for (const folder of new Set(Object.values(GUARD_SCOPE).flat())) {
      for (const file of sourceFiles(join(root, folder))) {
        if (ALLOWED_DIRECT_SETTINGS[rel(file)]) continue;
        read(file).split('\n').forEach((line, index) => {
          if (DIRECT_SETTING.test(line)) violations.push(`${rel(file)}:${index + 1}: ${line.trim()}`);
        });
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps the allow list free of files that no longer need an exception', () => {
    for (const file of Object.keys(ALLOWED_DIRECT_SETTINGS)) {
      expect(DIRECT_SETTING.test(read(join(root, file))), `${file}은 허용 목록에서 제거해야 합니다.`).toBe(true);
    }
  });
});
