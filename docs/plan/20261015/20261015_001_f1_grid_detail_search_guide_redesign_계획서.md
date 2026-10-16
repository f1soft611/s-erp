# F1-Grid 상세검색 연동 가이드 개편 계획서

## 목표

F1-Grid 문서 포털에서 개발자가 실제 상세검색 연동을 처음부터 따라 할 수 있도록, 기존 `필터와 정렬` 문서를 승인된 A안(단계별 레시피)으로 재구성한다.

## 실행 순서

1. 작업지시서, 본 계획서, 상세 사양서를 기준으로 범위와 정확성 조건을 고정한다.
2. `frontend/tests/f1-grid-docs.test.tsx`에 문서 순서·실제 검색 계약·예제·메타데이터 검증을 추가하고 RED를 확인한다.
3. `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`에서 기존 설명을 단계별 prose/code/api 섹션으로 재구성한다.
4. `frontend/src/pages/f1-grid-docs/F1-GRID.md`의 상세검색 설명과 포털 경로를 현재 실제 계약에 맞춘다.
5. 집중 테스트와 프로덕션 빌드를 실행하고, 브라우저에서 문서 검색/API 검색/목차/섹션을 확인한다.
6. 1280px, 768px, 375px 화면을 확인하고 모바일 페이지 수준 가로 overflow를 측정한다.
7. 실제 검증 결과와 데스크톱·모바일 스크린샷을 날짜별 결과 경로에 기록한다.

## 변경 대상

- 포털 문서 데이터 및 직접 관련 계약 테스트
- 상세검색 지속 가이드
- 20261015 작업 결과 문서와 스크린샷
- 작업지시서 및 상세 사양서는 구현 전 문서 기준으로 사용

## 검증 명령

`frontend` 폴더에서 실행한다.

```powershell
npm run test -- tests/f1-grid-docs.test.tsx
npm run build
```

브라우저는 `http://127.0.0.1:4173/f1-grid-docs`에서 검색어 `toPageSearchFields`와 `F1GridColumn.search`로 도달 경로를 확인한다. 반응형 화면 폭은 1280px, 768px, 375px이며, 375px에서 `scrollWidth`가 `clientWidth`를 넘지 않아야 한다.

## 주의

- 기안양식의 상세검색은 `categoryItemId`, `regTermId`, `useAt`이며, 양식코드/양식명은 별도 키워드 입력으로 검색한다.
- 날짜 범위는 일반적인 별도 예제로만 안내한다. 현재 기안양식 상세검색에 등록일 필터가 있거나 API 기간 파라미터가 존재한다고 표현하지 않는다.
- `toPageSearchFields`는 폼 필드 설정만 만들며 목록 API 호출은 페이지 관리 흐름의 책임이다.
- 기존 worktree의 무관한 변경을 수정하거나 되돌리지 않는다.

## 연결 문서

- [작업지시서](../../directions/20261015/20261015_001_f1_grid_detail_search_guide_redesign_작업지시서.md)
- [상세 사양서](../../spec/20261015/20261015_001_f1_grid_detail_search_guide_redesign_상세사양서.md)
- [승인된 설계](../../superpowers/specs/2026-10-15-f1-grid-detailed-search-guide-redesign.md)
