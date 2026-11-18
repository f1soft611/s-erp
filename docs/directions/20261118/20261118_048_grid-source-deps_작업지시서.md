# F1-Grid 서버 조회 의존성 작업지시서

- 근거: 잔여 lint 순차 처리 요청과 F1Grid 초기 서버 조회 effect의 loadDataSourcePage 누락 경고.
- 기준: [F1-GRID 서버 조회](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md#server-side-data-source).
- 기존 함수 본문을 유지한 채 현재 캡처 값으로 useCallback에 바인딩하고 기존 effect에 명시한다.
- 요청 중복 guard/generation/controller/취소, pageSize/offset, 서버 정렬/필터, append/교체/총건수, dirty patch·오류·로컬 모드·공개 props/JSX/CSS는 변경하지 않는다.
- 계획 → 사양 → 기준선/대상 lint RED → 구현/동일 회귀/정적 비교 → 실제 격리 서버 모드/문서/결과 → 별도 커밋·푸시 순서다.
