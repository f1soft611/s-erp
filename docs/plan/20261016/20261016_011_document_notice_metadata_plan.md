# Document notice metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 알림에서 기안자/상신일/결재상태/업무구분을 판단할 수 있는 라벨형 카드 제공.

**Architecture:** `useDocumentWritePage` 매핑에서 실제 상신일을 별도 표시 필드로 전달한다. 기존 `ApprovalNoticePanel` 안에서 상태 Chip과 라벨/값 정보를 렌더링하며 목록 날짜와 API는 보존한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Playwright.

## 근거

- [작업지시서](../../directions/20261016/20261016_011_document_notice_metadata_work_instruction.md)
- [설계](../../superpowers/specs/2026-10-16-document-approval-notice-metadata-design.md)

## Task 1: 실패 테스트

- [x] `frontend/tests/approval-notice-panel.test.tsx`에 실제 상신일, 기안자, 전체 업무구분, 상태 배지 검증을 추가한다. 상신일이 없고 `date`만 있으면 `—`가 보이며 date가 상신일로 표시되지 않아야 한다.

```tsx
expect(screen.getByText('기안자')).toBeInTheDocument();
expect(screen.getByText(item.author)).toBeInTheDocument();
expect(screen.getByText(item.kind)).toBeInTheDocument();
expect(screen.getByText('상신일')).toBeInTheDocument();
expect(screen.getByText('—')).toBeInTheDocument();
```

- [x] `frontend/tests/use-document-write-page.test.tsx`에서 서비스 목록/요약을 mock하고 `renderHook`으로 알림 매핑을 확인한다. API 상신일과 수정일이 다르면 실제 상신일이 표시되고 상신일이 없으면 빈 문자열이어야 한다.
- [x] `npm run test -- tests/approval-notice-panel.test.tsx tests/use-document-write-page.test.tsx` 실행. 신규 정보 검증이 실패해야 한다.

## Task 2: 연결 및 화면

- [x] `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`의 `DocumentWriteItem`에 `submittedDate?: string` 추가.
- [x] `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts` 매핑에 `submittedDate: formatDate(record.submittedAt)` 추가. 기존 `date` fallback은 변경하지 않는다.
- [x] `frontend/src/pages/groupware/documents/write/components/ApprovalNoticePanel.tsx`에서 상단 Stack에 알림 유형과 기존 상태 색상/variant Chip을 표시한다. 제목은 body2 굵은 텍스트로 표시한다. 하단 Box는 `gridTemplateColumns: 'auto minmax(0, 1fr)'`로 라벨/값을 표시한다.

```tsx
{[
  ['업무구분', item.kind],
  ['기안자', item.author],
  ['상신일', item.submittedDate || '—'],
].map(([label, value]) => (
  <Fragment key={label}>
    <Typography component="span" variant="caption" color="text.secondary">{label}</Typography>
    <Typography component="span" variant="caption" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>{value}</Typography>
  </Fragment>
))}
```

- [x] 동일 테스트 재실행: 모두 통과해야 한다. 기존 클릭/3건 제한/빈 상태 검증을 유지한다.

## Task 3: 검증 및 결과

- [x] `npm run build`, 변경 TS/TSX 대상 oxlint, `git diff --check` 실행. 다른 동시 작업의 오류는 임의 수정하지 않고 구분 기록한다.
- [x] 실제 컴포넌트와 앱 테마를 합성 데이터로 렌더링하고 세 폭에서 정보 표시/가로 넘침/클릭 및 Enter 선택을 검증한다. 실제 페이지에 알림이 없다면 통합 검증과 fixture 검증을 구분한다.
- [x] `docs/result/20261016/document-approval-notice-metadata/`에 결과와 스크린샷을 보관한다.

## 자기 검토

네 정보 및 날짜 분리, 긴 제목/이름 줄바꿈, 기존 동작 회귀, 반응형 확인을 모두 포함한다. 변경은 패널·매핑·UI 타입·관련 테스트에 한정하며 DB migration은 없다.
