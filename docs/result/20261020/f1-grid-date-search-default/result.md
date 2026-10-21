# F1-Grid 날짜 검색 기본값 결과

## 구현 내용

- 날짜 검색 metadata의 `search.defaultValue.from/to`에 고정 날짜 또는 서버 시스템 날짜 기준 연·월·일 offset을 지원하도록 추가했다.
- `GET /api/v1/common/system-date`는 로그인한 사용자에게 `EgovDateUtil.getToday()` 기준 날짜를 ISO `yyyy-MM-dd` 형식으로 `result.today`에 반환한다.
- 프런트엔드 resolver는 실제 날짜와 offset을 검증하고, system date를 필요한 경우 한 번만 요청한다. 계산 순서는 연도 → 월 → 일이며 월말과 윤년을 처리한다.
- `PageSearchArea`는 해석된 기본값을 표시하고 초기화 시 적용한다. 선택적 `onDetailReset`은 페이지가 초기화 조건으로 조회할 때만 사용하며 기존 공통 초기화는 자동 조회하지 않는다.
- 문서현황 결재신청일은 컬럼 metadata에서 서버 날짜 기준 최근 1개월로 선언한다. 서버 날짜 응답 전에 그리드 목록 요청을 보내지 않고 실패 시 오류와 재시도를 제공한다.
- 문서현황 세션이 존재하면 해당 조건을 우선 복원한다. 세션에 없는 날짜 조건을 화면에서만 기본값으로 표시하지 않도록 했고, 기본값 요청이 끝나기 전에 null 세션을 저장하지 않도록 `usePageSessionState`의 조건부 persistence를 추가했다.
- [F1-GRID.md](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)에 선언 방식, 계산, 오류, 초기화 및 문서현황 동작을 기록했다.

## 검증 결과

| 검증 | 결과 |
|---|---|
| F1-Grid metadata, system-date service, resolver, hook, PageSearchArea, session-state 및 문서현황 타깃 테스트 | 37개 중 36개 통과. 기존 `updatedAt` 상세검색 metadata 기대 불일치 1건 실패 |
| 문서현황 서버 날짜 metadata 개별 테스트 | 통과 |
| 문서현황 초기 요청 대기, API 실패/재시도, 검색 세션 복원, 초기화 및 재진입 테스트 | 통과 |
| 저장된 세션에서 날짜 endpoint가 생략된 경우 UI와 실제 조회조건 일치 | 통과 |
| 백엔드 `mvn "-Dtest=CommonSystemDateApiControllerTest" test` | 2개 테스트 통과 |
| 프런트엔드 `npm run build` | TypeScript 검사 및 Vite build 통과 |
| `git diff --check` | 통과 |
| 실제 브라우저 375px/768px/1280px 및 스크린샷 | 인증 후 문서현황에 진입할 수 없어 수행하지 못함 |

### 기존 상세검색 테스트 실패

`tests/document-status-page.test.tsx`의 `derives detailed search fields from the F1-Grid column metadata`는 상세검색 필드 결과에 `updatedAt`이 포함될 것으로 기대하지만, 기존 컬럼 metadata는 이를 노출하지 않아 실패한다. 날짜 기본값 변경과 무관한 기존 불일치이며 이번 범위에서는 metadata를 임의로 바꾸지 않았다. 결재신청일 기본값은 별도 테스트에서 성공적으로 확인했다.

### 빌드 경고

Vite build가 성공했으나 기존 번들 중 1 MB 초과 chunk에 대한 크기 경고가 표시됐다. 이번 작업에서 번들 구성을 변경하지 않았다.

### 브라우저 확인 제한

기존 S-ERP Vite 서버가 문서화된 `127.0.0.1:4173`에서 실행 중인 것을 확인하고 재사용했다. 앱은 로그인 화면으로 이동했으며 브라우저 도구에서 인증을 완료해 문서현황을 열 수 없었다. 따라서 요청조건·초기화 렌더링과 반응형 레이아웃을 실제 화면에서 확인하지 못했고 스크린샷도 저장하지 않았다. 로그인 화면에는 테스트용 계정 안내가 표시되어 있어 그 화면을 결과물로 캡처하지 않았다.

## 데이터베이스 영향

DB 테이블·컬럼·쿼리 변경이 없고 migration도 추가하지 않았다. 이 기능은 업무 데이터 계약을 사용하지 않는다. 백엔드 날짜는 기존 `EgovDateUtil`만 사용한다.
