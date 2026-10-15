# 문서작성 리스트 배지 순서 변경 결과

## 적용 내용

- 공용 `ListView`에 선택적 배지 순서를 추가했습니다. 기본값은 기존 `문서구분 → 결재상태`입니다.
- 문서작성 페이지에서만 `결재상태 → 문서구분` 순서를 지정했습니다.
- 기존 배지 라벨, 색상, 크기, 조건부 표시 및 행 클릭 동작은 변경하지 않았습니다.

## 검증 결과

| 항목 | 결과 |
|---|---|
| `npx vitest run tests/common-view-mode.test.tsx` | 통과: 11 tests |
| 대상 회귀 테스트 3개 (`common-view-mode`, `document-write-page`) | 통과: 3 tests |
| 변경 파일 Problems 검사 | 오류 없음 |
| `git diff --check` | 통과 |
| `npm run build` | 실패: 이번 변경과 무관한 진행 중 `community/archive` 코드에서 TypeScript 오류가 발생해 Vite 빌드 단계에 도달하지 못함 |
| 전체 기준선 테스트 | 72 passed, 21 failed. 시간 초과 및 기존 상세 결재 툴바 테스트의 divider 부재 실패가 포함되어 있었음 |

문서작성 리스트 통합 테스트는 새 상태 우선 순서 검증을 포함해 통과했습니다. 전체 기준선 테스트의 실패는 문서작성 리스트 순서 외 동작에 있었으며, 이 작업에서는 수정하지 않았습니다. 빌드 오류는 변경하지 않은 `ArchiveComposerDialog.tsx`의 `inputProps`/`Stack` 타입과 `ArchivePostDetail.tsx`의 `Stack` 타입 관련 문제입니다.

## 브라우저 확인

실행 중인 문서작성 페이지에서 세 뷰포트를 확인했습니다. 각 뷰포트에서 행의 배지 DOM 순서는 상태 → 문서구분이었고, 페이지 본문에 뷰포트 초과 가로 스크롤은 없었습니다.

| 뷰포트 | 확인 | 캡처 |
|---|---|---|
| 375px | 통과: 임시저장 → 기안 순서 확인. 좁은 앱 콘텐츠 영역에서 제목/배지 텍스트 일부가 제한적으로 보이는 기존 레이아웃 제약도 관찰됨 | [375px 문서작성 목록](./screenshots/doc-write-375.png) |
| 768px | 통과: 결재진행중 → 기안 순서 확인 | [768px 문서작성 목록](./screenshots/doc-write-768.png) |
| 1280px | 통과: 결재진행중 → 기안 순서 확인 | [1280px 문서작성 목록](./screenshots/doc-write-1280.png) |

## 관련 문서

- [작업지시서](../../directions/20261015/20261015_013_document_write_list_badge_order_work_instruction.md)
- [계획서](../../plan/20261015/20261015_013_document_write_list_badge_order_plan.md)
- [상세 사양서](../../spec/20261015/20261015_013_document_write_list_badge_order_spec.md)
