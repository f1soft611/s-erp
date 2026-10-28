# 현황 빈 조회 결과 공통 메시지 결과

## 구현

- 문서현황(업무현황) 하단의 전용 안내를 제거하고 수주현황과 함께 검색조건 아래 공통 메시지 영역을 사용하도록 변경했다.
- `EmptySearchResultMessage`가 기존 `PageMessageArea`를 재사용하여 info 색상, `role="status"`, 공통 안내 문구와 `검색 조건 초기화` 버튼을 제공한다.
- PageMessageArea의 기존 오류 기본값, 메시지 정규화, 닫기 동작은 유지했다. 선택적 action과 role을 추가하고 초기화 버튼은 좁은 화면에서 줄바꿈하도록 했다.
- 정상 조회 완료 후 0건인 경우만 표시한다. 최초 로딩, 재조회, 조용한 갱신, 목록 오류 및 검색 기본값 오류에는 표시하지 않는다.
- 수주 목록의 `hasLoaded`로 최초 빈 배열과 정상 0건을 구분하며, 오류 닫기 이후에도 빈 결과 안내가 잘못 복원되지 않는다.
- 초기화는 기존 페이지별 resetSearch를 사용한다. 필수 기준일 및 서버 기본 기간을 유지한다.
- 두 현황 화면만 명시적으로 사용한다. 다른 화면, F1-Grid 자체, API, 백엔드와 DB는 변경하지 않았다.

## 검증

| 검증 | 결과 |
|---|---|
| 변경 전 회귀 테스트 | 문서현황은 info 메시지 대신 하단 Box라 실패, 수주현황은 안내가 없어 실패 |
| 관련 페이지 테스트 | `node node_modules\vitest\vitest.mjs run tests\document-status-page.test.tsx tests\sales-order-status-page.test.tsx --maxWorkers=1`: 45/45 통과 |
| 프로덕션 빌드 | `npm run build`: TypeScript 및 Vite 성공 |
| 변경 파일 린트 | oxlint 오류 0. 수주 목록 훅의 기존 set-state-in-effect 경고는 유지 |
| 전체 린트 | 기존 `tests/common-code-management-page.test.tsx:53`의 조건부 useImperativeHandle 오류로 실패. HEAD에도 동일 코드가 있어 이번 범위에서 수정하지 않음 |
| 실제 브라우저 | `node scripts\capture-status-empty-message.js`: 두 실제 페이지, 375/768/1280px 모두 통과 |
| 배치/반응형 | 안내가 그리드 위에 위치, 문구·버튼 겹침 없음, 페이지 scrollWidth가 각 뷰포트 너비와 동일 |
| 상태 전환 | 재조회 대기 및 오류 시 안내 숨김, 오류 닫기 후에도 숨김 유지 |
| 초기화 날짜 | 가상 서버 기준일 2026-10-28에서 2026-09-28~2026-10-28 복원 |
| 브라우저 런타임 | 오류 0 |

브라우저 검증은 `http://127.0.0.1:4173`의 기존 S-ERP 개발 서버를 확인하여 재사용했다. API는 Playwright에서 가로채 가상 빈 목록과 가상 오류만 사용했으며 실제 인증/테넌트 데이터를 조회·저장하지 않았다. 직접 시작한 서버가 없으므로 기존 서버는 종료하지 않았다. 브라우저 컨텍스트와 프로세스는 스크립트 finally에서 정리했다.

테스트 작성 시 구버전 MUI 클래스명 `MuiAlert-standardInfo`를 사용해 한 차례 추가 실패했다. 실제 MUI DOM의 `MuiAlert-colorInfo`로 검사 대상을 바로잡은 뒤 관련 45개 테스트를 재실행해 모두 통과했다. 최초 병렬 테스트에서 발생한 기존 상세 패널 탐색 타임아웃도 단일 worker 실행에서는 재현되지 않았다.

## 스크린샷

| 화면 | 375px | 768px | 1280px |
|---|---|---|---|
| 문서현황 | [모바일](screenshots/document-375.png) | [태블릿](screenshots/document-768.png) | [데스크톱](screenshots/document-1280.png) |
| 수주현황 | [모바일](screenshots/sales-order-375.png) | [태블릿](screenshots/sales-order-768.png) | [데스크톱](screenshots/sales-order-1280.png) |

## 최종 점검

- 작업지시서 → 계획서 → 상세사양서 → 구현 → 결과 문서 순서를 적용했다.
- 사용자 승인 위치, 적용 대상 두 화면, 0건/로딩/오류/초기화 동작을 요구사항과 대조했다.
- 기존 미커밋 변경은 보존했다. 요청받지 않은 커밋과 병합은 수행하지 않았다.
- DB/API 계약 변경이 없어 DB MCP 및 스키마 스크립트는 해당하지 않는다.

## 기준 문서

- [작업지시서](../../../directions/20261028/20261028_015_status-empty-message_작업지시서.md)
- [계획서](../../../plan/20261028/20261028_015_status-empty-message_계획서.md)
- [상세사양서](../../../spec/20261028/20261028_015_status-empty-message_상세사양서.md)
