# 영업관리 작성 기준일 서버날짜 통일 결과

## 변경 사항

- 수주일자·출하일자·명세일의 신규 기본값과 폼 초기화 값을 `/api/v1/common/system-date`의 서버날짜로 변경했다.
- 서버날짜 요청 실패 시 브라우저 날짜를 대체하지 않고 오류를 표시한다. 각 폼의 신규/초기화 동작으로 다시 조회할 수 있다.
- 기존 자료의 저장 날짜와 선택한 원천 자료 날짜는 유지했다. 견적작성의 기존 서버날짜 사용은 변경하지 않았다.
- 현황 검색의 기간 기본값은 오늘 날짜 단일 기본값이 아니므로 범위에서 제외했다.

## 검증

- TDD: 서버날짜 기본값·초기화·조회 실패 시 로컬 날짜 미사용 테스트가 구현 전 실패함을 확인했다.
- `npx vitest run tests/sales-order-create-page.test.tsx tests/sales-delivery-page.test.tsx tests/sales-statement-page.test.tsx --reporter=dot`: 최종 재실행에서 67개 테스트 통과. 앞선 병렬 실행에서 거래명세서 현황 상세 테스트가 시간 초과했으나, 해당 테스트 단독 재실행과 세 테스트 파일 전체 재실행 모두 통과했다.
- `npm run build`: TypeScript 검사 및 Vite 빌드 통과.
- 변경 파일 `npx oxlint`: 오류 없음. 비동기 API 응답 상태 갱신을 가리키는 `react(set-state-in-effect)` 경고 3건은 남아 있다.
- 실제 브라우저에서 세 작성폼 모두 모의 서버날짜 `2000-02-03` 표시를 확인했다.

## 스크린샷

- [수주 작성](screenshots/order-server-date-default.png)
- [출하 작성](screenshots/delivery-server-date-default.png)
- [거래명세서 작성](screenshots/statement-server-date-default.png)

## Flow

- 기본 프로젝트 `3005724`에 작업 등록: [영업관리 작성 기준일을 서버날짜로 통일](https://flow.team/l/QzqMr) (`taskId: 50329905`, 대기)

## 커밋 메시지 초안

**제목:** `fix: 영업관리 작성 기준일을 서버날짜로 통일`

**본문:**

- 수주·출하·명세 작성폼의 신규 기본일과 초기화 날짜를 서버 시스템 날짜로 적용
- 서버 날짜 조회 실패 시 로컬 날짜로 대체하지 않고 오류 표시
- 관련 작성폼 회귀 테스트와 결과 문서 추가

커밋은 생성하지 않았다.
