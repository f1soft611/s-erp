# 문서작성 리스트 배지 순서 변경 계획서

## 목표

문서작성 페이지의 리스트형 행에서 결재상태가 문서구분보다 먼저 표시되게 하되, 공유 `ListView`의 기본 순서와 공지사항 목록은 유지한다.

## 작업 범위

- `frontend/src/shared/components/view-mode/ListView.tsx`: 선택형 배지 순서 속성을 추가하고 기존 기본 순서를 유지한다.
- `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`: 문서 목록에만 상태 우선 설정을 전달한다.
- `frontend/tests/common-view-mode.test.tsx`: 속성이 생략된 기존 카테고리 우선 순서를 회귀 검증한다.
- `frontend/tests/document-write-page.test.tsx`: 문서작성 리스트의 상태 우선 DOM 순서를 검증한다.
- `docs/spec/20261015/20261015_013_document_write_list_badge_order_spec.md`: 동작 및 검증 기준을 기록한다.
- `docs/result/20261015/document-write-list-badge-order/`: 결과 문서와 반응형 브라우저 캡처를 기록한다.

## 구현 순서

1. 테스트에서 문서작성 행의 칩 순서와 공유 리스트 기본 순서를 명시한다.
2. 두 테스트 파일을 실행해 신규 문서작성 순서 검증이 실패하는지 확인한다.
3. `ListView`에 기본값이 기존 순서인 배지 순서 속성을 추가하고, 문서작성 페이지에서만 상태 우선으로 지정한다.
4. 관련 테스트를 다시 실행한다.
5. 프론트엔드 빌드, Problems 검사, `git diff --check`를 수행한다.
6. 브라우저에서 375px, 768px, 1280px 화면을 확인하고 결과 문서와 캡처를 저장한다.

## 검증 기준

- 문서작성 리스트에서 같은 행의 결재상태 Chip이 문서구분 Chip보다 먼저 DOM에 놓인다.
- `ListView` 속성을 생략하면 카테고리 Chip이 상태 Chip보다 먼저 DOM에 놓인다.
- 배지 텍스트, 색상/스타일, 행 클릭 동작은 변하지 않는다.
- 다음 테스트를 통과한다.

```powershell
Set-Location frontend
npx vitest run tests/common-view-mode.test.tsx tests/document-write-page.test.tsx
npm run build
```

- 결과 문서에 브라우저 검증 뷰포트 및 캡처 경로를 기록한다.

## 작업지시서 및 상세 사양

- 작업지시서: [문서작성 리스트 배지 순서 작업지시서](../../directions/20261015/20261015_013_document_write_list_badge_order_work_instruction.md)
- 상세 사양서: [문서작성 리스트 배지 순서 상세 사양서](../../spec/20261015/20261015_013_document_write_list_badge_order_spec.md)
