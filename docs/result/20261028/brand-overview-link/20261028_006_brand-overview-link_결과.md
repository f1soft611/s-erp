# S-ERP 로고 종합현황 이동 결과

근거: [상세사양서](../../../spec/20261028/20261028_006_brand-overview-link_상세사양서.md)

## 변경

- 기존 브랜드 텍스트는 클릭 동작이 없는 Typography였다.
- DashboardModuleSection의 Typography를 React Router Link로 렌더링해 `/groupware/overview`로 이동하도록 변경했다.
- 기존 브랜드 스타일을 유지하고 링크 밑줄만 제거했다. Tab/Enter 및 기본 키보드 초점을 지원한다.
- 모듈/메뉴 선택, 접근권한, API와 DB 계약은 변경하지 않았다. 백엔드 검증 및 DB MCP/SQL 변경은 해당하지 않는다.

## 검증

- 회귀 테스트: 변경 전 링크를 찾지 못해 3건 실패, 변경 후 3건 통과. 다른 모듈/같은 모듈/이미 종합현황인 경우를 확인했다.
- `npm run build`: 성공.
- 변경 컴포넌트와 테스트의 `npm run lint -- ...`: 성공.
- 기존 `http://127.0.0.1:4173` S-ERP 서버를 재사용했다. 직접 시작한 서버는 없다.
- Chromium 합성 응답 검증: light/dark × 375/768/1280px 모두 다른 모듈과 같은 모듈에서 클릭 이동, 동일 화면 재클릭, Tab/Enter 이동 성공.
- 브라우저 전역 표식이 유지되어 전체 페이지 새로고침 없는 이동을 확인했다. 종합현황 제목 표시, 페이지 가로 넘침 없음, 런타임 오류 없음.
- 실제 계정이나 업무 데이터는 사용하지 않았다.

## 스크린샷

| 너비 | 밝은 테마 | 다크 테마 |
| --- | --- | --- |
| 375px | [light](screenshots/light-375.png) | [dark](screenshots/dark-375.png) |
| 768px | [light](screenshots/light-768.png) | [dark](screenshots/dark-768.png) |
| 1280px | [light](screenshots/light-1280.png) | [dark](screenshots/dark-1280.png) |
