# 20261015_003 문서 결재 툴바 시각 정합 결과 보고서

## 작업 내용

- 결재 상태 도장의 테두리와 대체 텍스트 색상을 해당 결재선 참가자 테두리의 상태별 색상과 동일하게 맞췄다. 상태별 점선/실선 및 실제 도장 이미지 표시는 유지했다.
- 결재 상태 및 문서구분 Chip을 각각 28px 높이로 맞추고 공통 8px 반경을 유지했다.
- 액션 버튼은 댓글 `등록` 버튼과 기존 작은 버튼 geometry를 유지했으며, 가로/세로 padding 규칙은 변경하지 않았다.
- 문서구분 Chip 오른쪽에 4px 여백을 추가했다. 기존 Stack 간격과 합산하여 문서구분 Chip-구분선 간격은 8px이며, 구분선-상단 고정 아이콘 간격은 기존 4px다.
- 결재 동작, 권한, 순서, 라벨, API, 반응형 줄바꿈 로직은 변경하지 않았다.

## 변경 파일

- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- `frontend/tests/document-write-page.test.tsx`
- `docs/spec/20261014/20261014_008_문서결재취소_상태구분표시통일_상세사양서.md`
- `docs/spec/20261015/20261015_003_document_approval_toolbar_visual_consistency_spec.md`
- `docs/plan/20261015/20261015_003_document_approval_toolbar_visual_consistency_plan.md`

## 검증 결과

### 집중 테스트

실행 위치: `frontend`

```powershell
npx vitest run tests/document-write-page.test.tsx --testNamePattern="matches a pending approval seal to its participant border color|shows the ordered approval toolbar to a feed approver|lets the drafter cancel a pending submission|lets an approver cancel their own approval" --testTimeout=25000
```

- 결과: **4 passed, 79 skipped**
- 도장 색상 일치, 피드 액션 버튼과 댓글 등록 버튼 geometry, 배지 높이/반경, 구분 Chip 간격 및 상세 취소 버튼 geometry를 확인했다.

### 프론트엔드 빌드

```powershell
npm run build
```

- 결과: **통과**
- TypeScript 검사 및 Vite production build가 완료됐다.
- 기존 번들 크기 경고: `index` chunk가 minification 후 1,000 kB를 초과한다. 이번 변경과 무관한 기존 경고이며 빌드는 성공했다.

### 별도 기존 테스트 실패

`renders read-only system events and keeps only the required detail separators` 테스트는 별도 결재 순번 배지 작업의 접근성 이름 assertion `getByLabelText(/^합의 순번 /)`에서 실패했다. 렌더링된 합의 순번 요소에 해당 accessible label이 없어 발생한 것으로, 이번 도장/툴바 변경 범위와 무관하여 수정하지 않았다. 이번 기능 검증은 도장 색상 assertion을 분리한 테스트와 툴바/취소 테스트로 실행했다.

### 브라우저 및 스크린샷

- `http://127.0.0.1:4173`의 기존 S-ERP 서버를 확인했다. 기존 브라우저 페이지는 그룹웨어 종합현황에 있었으나 해당 페이지에서 상호작용할 수 없었다.
- 새 브라우저 컨텍스트는 로그인 화면으로 이동해 문서 상세의 인증된 화면을 열지 못했다.
- 따라서 375px, 768px, 1280px 실제 브라우저 레이아웃 확인과 스크린샷 저장은 수행하지 않았다. 반응형 동작을 시각적으로 확인했다고 주장하지 않는다.

### 정적 검사

- `git diff --check`: 통과
- 수정한 TypeScript/TSX 파일 Problems 검사: 오류 없음
