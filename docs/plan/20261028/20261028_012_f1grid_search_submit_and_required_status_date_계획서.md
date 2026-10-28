# 상세검색 조건 제출 및 현황 기준일 필수화 계획서

## 목표

칩 조건 제거는 초안만 바꾸고 조회 버튼을 명시적으로 눌렀을 때만 검색을 실행한다. 문서현황의 결재신청일을 필수화하고, 구형 세션에 날짜가 없으면 시스템 기본 기간으로 복구한다.

## 파일별 계획

- `frontend/tests/page-search-area-detail.test.tsx`: 칩 제거는 검색하지 않는지, 여러 칩 제거가 누적되는지, 필수 조건 칩 해제가 차단되는지, 적용칩/조회 전 안내가 정확한지 테스트한다.
- `frontend/src/shared/components/PageSearchArea.tsx`: 선택적 조건 제거는 `draftValues`를 기반으로 변경하고 검색 callback을 호출하지 않는다. 필수 조건 X와 이미 제거된 필드의 X는 비활성화한다.
- 상세검색 하단은 데스크톱에서 칩과 버튼을 한 행, 안내를 다음 전체 행에 두고, 좁은 화면에서 버튼을 첫 행 우측에 두어 칩 영역이 충분한 너비를 확보하게 한다.
- `frontend/tests/document-status-page.test.tsx`: 문서현황 날짜 필수 검증, 누락된 날짜 세션의 기본값 복구와 최초 조회 요청을 검사한다.
- `frontend/src/pages/groupware/documents/status/data/documentStatusColumns.tsx`: `submittedAt.search.required` 메타데이터를 추가한다.
- `frontend/src/pages/groupware/documents/status/hooks/useDocumentStatusSearch.ts`: 서버 기본값 준비 시 저장 세션에 날짜 범위가 없으면 기본값을 병합하여 상태·최초 필터·세션을 일치시킨다.
- `frontend/AGENTS.md`: 신규 현황 페이지는 필수 기준일 검색조건을 정의해야 한다는 공통 규칙을 추가한다.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: 상세검색 칩의 초안 제거/명시 조회 동작과 필수 현황 기준일 규칙을 설명한다.
- `docs/result/20261028/f1grid-search-submit-and-required-status-date/`: 검증 결과 및 스크린샷을 남긴다.

## 실행 순서

1. 상세검색 칩 단건/연속 제거 테스트를 추가하고 실패를 확인한다.
2. 편집 중인 초안 기준으로 연속 제거를 처리하고, 필수 필드 또는 이미 비워진 필드의 제거 X를 비활성화한다.
3. 최소 공통 구현을 적용하고 상세검색 테스트를 통과시킨다.
4. 문서현황 필수 날짜와 구형 세션 기본 기간 복구 테스트를 추가하고 실패를 확인한다.
5. 페이지 메타데이터와 검색 세션 초기화를 구현한다.
6. 문서현황 및 관련 회귀 테스트, 프로덕션 빌드를 실행한다.
7. 개발 서버에서 요구되는 레이아웃을 확인하고 결과 문서/스크린샷을 저장한다.
8. `git diff --check`와 변경 파일 범위를 점검하고 관련 문서를 함께 갱신한다.

## 검증 명령

```powershell
cd frontend
npm run test -- tests/page-search-area-detail.test.tsx tests/document-status-page.test.tsx
npm run build
```

화면 레이아웃 변경은 375px, 768px, 1280px 브라우저 너비에서 확인한다. 기존 개발 서버는 재사용하고 임의로 종료하지 않는다.

## 기준

- [작업지시서](../../directions/20261028/20261028_012_f1grid_search_submit_and_required_status_date_작업지시서.md)
- [상세사양서](../../spec/20261028/20261028_012_f1grid_search_submit_and_required_status_date_상세사양서.md)
- [승인 설계](../../superpowers/specs/2026-10-28-f1grid-search-submit-and-required-status-date-design.md)
