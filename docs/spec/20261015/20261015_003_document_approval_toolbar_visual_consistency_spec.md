# 20261015_003 문서 결재 툴바 시각 정합 상세 사양서

## 1. 목적 및 기준

문서 피드·상세의 공통 결재 툴바에서 결재선 도장 색상, 액션 버튼과 배지 높이, 업무구분 배지와 구분선 사이의 간격을 통일한다. 결재 상태, 권한, 액션, API 및 반응형 줄바꿈 동작은 변경하지 않는다.

- 승인 설계: [문서 결재 툴바 시각 정합 설계](../../superpowers/specs/2026-10-15-document-approval-toolbar-visual-consistency-design.md)
- 계획서: [문서 결재 툴바 시각 정합 계획](../../plan/20261015/20261015_003_document_approval_toolbar_visual_consistency_plan.md)

## 2. 결재 상태 도장 색상

- 결재선 참가자 테두리에 사용하는 상태별 `approvalLineStatusBorderColors[statusTone]`를 도장 원형의 테두리 및 대체 텍스트 색상에 함께 사용한다.
- 진행 중 결재선과 해당 도장은 모두 `info.main` 색상이어야 한다.
- 중립 상태의 점선 테두리와 그 외 상태의 실선 테두리 규칙은 보존한다.
- 완료된 결재선에서 승인자의 실제 도장 이미지가 표시되는 동작, 이미지 대체 텍스트 및 상태 라벨은 변경하지 않는다.

## 3. 툴바 컨트롤 크기 및 간격

- 승인, 반려, 보완요청, 상신 취소, 승인 취소 버튼은 댓글 `등록` 버튼과 동일하게 `min-height: 28px` 및 같은 geometry를 유지한다.
- 액션 버튼의 세로 padding은 4px, 가로 padding은 10px로 유지한다. 라벨에 따른 버튼의 자연 너비와 상세 댓글 `등록` 버튼에 대한 기존 geometry 검증을 유지한다.
- 결재 상태 및 문서구분 Chip 높이는 각각 28px이며 두 Chip 모두 `border-radius: 8px`을 유지한다.
- 문서구분 Chip의 오른쪽에 4px 여백을 추가한다. 기존 Stack 요소 간격 4px와 합산한 문서구분 Chip-세로 구분선 사이 간격은 총 8px이어야 한다.
- 세로 구분선과 상단 고정 아이콘 사이의 간격은 기존 4px를 유지한다.

## 4. 보존 범위 및 반응형

- 툴바 순서, 라벨, 색상, variant, 권한 판정, 이벤트 처리기, 확인 대화상자, API 요청은 변경하지 않는다.
- 피드와 상세가 공유하는 기존 툴바 컴포넌트에서 동일하게 적용한다.
- 좁은 화면에서 툴바 항목이 기존처럼 줄바꿈되며 요소가 겹치거나 페이지 가로 overflow가 생기지 않아야 한다.
- 결재선 구성, 상태 전이, 업무 로직 및 데이터 구조는 변경하지 않는다.

## 5. 회귀 검증 기준

`frontend/tests/document-write-page.test.tsx`에서 다음을 확인한다.

1. 진행 중인 결재선 도장(border 및 fallback text) 색상이 동일 결재선 참가자 테두리와 같다.
2. 결재 상태 Chip과 문서구분 Chip 높이는 각각 28px이다. 액션 버튼은 댓글 `등록` 버튼과 동일한 크기 규칙 및 geometry를 유지한다.
3. 두 Chip의 8px 반경과 액션 버튼의 댓글 `등록` geometry 일치가 유지된다.
4. 문서구분 Chip 오른쪽 여백이 4px이고 기존 액션 → 상태 → 구분 → 구분선 → 상단 고정 순서가 유지된다.
5. 기존 결재선 이미지 도장 및 피드/상세 동작 회귀 테스트가 유지된다.

## 6. 검증 명령

`frontend` 디렉터리에서 관련 테스트와 프로덕션 빌드를 실행한다.

```powershell
npx vitest run tests/document-write-page.test.tsx --testNamePattern="matches a pending approval seal to its participant border color|shows the ordered approval toolbar to a feed approver|lets the drafter cancel a pending submission|lets an approver cancel their own approval" --testTimeout=25000
npm run build
```

가능한 경우 로그인된 문서 상세 화면에서 375px, 768px, 1280px 뷰포트를 확인하고, 접근할 수 없는 경우 결과 보고서에 제한을 기록한다.
