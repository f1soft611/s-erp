import { describe, expect, it } from 'vitest';
import {
  getApprovalStatusPresentation,
  getApprovalSystemEventPresentation,
  getDocumentKindPresentation,
} from '../src/pages/groupware/documents/write/data/documentPresentation';

describe('document presentation metadata', () => {
  it.each([
    ['DRAFT_SAVED', '임시저장', 'default', 'outlined', 'DRAFT'],
    ['SUBMITTED', '결재신청', 'info', 'filled', 'PENDING'],
    ['REJECTED', '반려', 'error', 'filled', 'REJECTED'],
    ['APPROVED', '승인', 'success', 'filled', 'COMPLETED'],
    ['COMPLETED', '완료', 'success', 'filled', 'COMPLETED'],
    ['RETURNED', '보완요청', 'warning', 'filled', 'REVISION_REQUESTED'],
  ] as const)('maps system event %s to the existing status colors', (eventType, label, color, variant, status) => {
    expect(getApprovalSystemEventPresentation(eventType)).toEqual({ label, color, variant });
    expect(getApprovalSystemEventPresentation(eventType)).toMatchObject({
      color: getApprovalStatusPresentation(status).color,
      variant: getApprovalStatusPresentation(status).variant,
    });
  });

  it.each(['RESUBMITTED', 'SUBMISSION_CANCELED', 'APPROVAL_CANCELED', 'DELETED', 'UNKNOWN', 'toString', ''])(
    'preserves the existing display for unsupported event %s',
    (eventType) => {
      expect(getApprovalSystemEventPresentation(eventType)).toBeUndefined();
    },
  );

  it.each([
    ['DRAFT', '임시저장', 'default', 'outlined'],
    ['PENDING', '결재진행중', 'info', 'filled'],
    ['IN_PROGRESS', '결재진행중', 'info', 'filled'],
    ['COMPLETED', '승인', 'success', 'filled'],
    ['REJECTED', '반려', 'error', 'filled'],
    ['REVISION_REQUESTED', '보완요청', 'warning', 'filled'],
  ] as const)('maps %s to its canonical status badge', (status, label, color, variant) => {
    expect(getApprovalStatusPresentation(status)).toEqual({ label, color, variant });
  });

  it.each([
    ['DRAFTING', '기안', 'primary'],
    ['BUSINESS_CONTACT', '업무', 'info'],
    ['EXPENSE_RESOLUTION', '지출', 'warning'],
    ['ATTENDANCE_APPLICATION', '근태', 'secondary'],
  ] as const)('maps %s to its canonical document-kind badge', (kind, label, color) => {
    expect(getDocumentKindPresentation(kind)).toEqual({ label, color });
  });
});
