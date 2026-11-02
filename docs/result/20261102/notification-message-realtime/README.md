# 알림·쪽지 실시간 갱신 결과

근거: [작업지시서](../../../directions/20261102/20261102_008_알림쪽지_실시간갱신_작업지시서.md), [계획서](../../../plan/20261102/20261102_008_알림쪽지_실시간갱신_계획서.md), [상세사양서](../../../spec/20261102/20261102_008_알림쪽지_실시간갱신_상세사양서.md).

## 구현

- 인증된 `GET /api/v1/groupware/realtime` SSE 연결을 추가했다. 소유자는 기존 인증 principal에서만 결정하며 tenant/user별로 연결을 격리한다.
- 연결 준비 신호와 NOTIFICATION/MESSAGE 변경 종류만 전송한다. 알림·쪽지 본문, 계정 정보, 인증 정보, 이동 URL은 전송하지 않는다.
- 저장 트랜잭션 commit 이후에만 변경 신호를 발행한다. rollback/실패는 발행하지 않으며 전송 실패로 저장 성공이 실패로 바뀌지 않는다.
- 알림 생성·읽음·보관과 쪽지 생성·답장·읽음·대화 숨김을 연결했다. 실제 변경 없는 읽음 반복은 쪽지 갱신 신호를 만들지 않는다.
- 소유자별 최대 6개 연결, 15초 heartbeat, 45초 연결 회전과 completion/timeout/error 정리를 적용했다.
- 브라우저는 기존 토큰 갱신과 Authorization 헤더를 사용하는 fetch streaming으로 연결한다. URL에 인증 정보를 넣지 않는다.
- chunk/CRLF 파싱, 250ms 신호 병합, 최대 30초 backoff 재연결, 화면에 표시된 인증 세션의 30초 REST 재동기화를 제공한다. 숨김·로그아웃·계정 전환·unmount 시 연결과 타이머를 정리한다.
- 헤더 배지, 열린 알림 팝오버, 알림함의 선택 필터·로딩된 페이지 범위, 쪽지함 목록·선택 대화를 기존 권한 API로 조용히 갱신한다. 일시적 오류에는 기존 화면을 유지한다.
- 과거 날짜 대화와 미전송 답장을 보존한다. 읽음 변화나 새 메시지가 현재 스크롤을 강제 이동시키지 않으며 기존 하단 근처에서만 최신 메시지를 따른다.
- 선택 변경 뒤 늦게 도착한 대화 응답·실패를 무시한다. 갱신 중 추가 신호는 병합 후 다시 조회한다.

## 검증

| 구분 | 결과 |
|---|---|
| Maven 대상 8개 테스트 클래스 | 56개 통과, 실패·오류·skip 없음 |
| Vitest 대상 7개 파일 | 41개 통과 |
| 프런트엔드 `npm run build` | 통과 |
| 변경 프런트 소스·테스트 oxlint | 오류 없음, 기존 초기 조회 effect/dependency 패턴 경고 5개 |
| 전체 `npm run lint` | 미통과: 변경하지 않은 `tests/common-code-management-page.test.tsx:53`의 기존 조건부 `useImperativeHandle` 오류. 해당 파일이 HEAD와 동일함을 확인 |
| 실제 앱 브라우저 | 375/768/1280px 통과, 브라우저 실행 오류·페이지 가로 넘침 없음 |
| 독립 코드 리뷰 | 이번 변경에서 중대한 문제 발견 없음 |

서버 검증:

```powershell
Set-Location backend
mvn -q "-Dtest=RealtimeSecurityTest,RealtimePublisherTest,RealtimeStreamServiceTest,RealtimeApiControllerTest,NotificationServiceImplTest,DirectMessageServiceImplTest,NotificationMapperXmlTest,DirectMessageMapperXmlTest" test
```

클라이언트 검증:

```powershell
Set-Location frontend
npx vitest run tests\realtime-service.test.ts tests\realtime-refresh.test.tsx tests\notification-center.test.tsx tests\notification-inbox.test.tsx tests\message-inbox.test.tsx tests\message-chat-links.test.tsx tests\api-network-error.test.ts --reporter=dot
npm run build
node tests\realtime.browser.mjs
```

- 신규 전송/화면 회귀를 먼저 실패시킨 뒤 구현했다. 선택 대화의 오래된 실패가 새 대화를 덮어쓰는 재현도 실패→수정→통과로 확인했다.
- 전송 분할/잘못된 신호, 재연결, 로그아웃/숨김/계정 전환, 주기 복구, 요청 직렬화, 인증 대기 중 취소, 스트림 본문 미소비를 확인했다.
- 알림함의 여러 로딩 페이지와 구분 필터, 배지·열린 팝오버 갱신, 쪽지 답장·스크롤 보존을 회귀 검증했다.
- 기존 4173 S-ERP 서버를 재사용했고 종료하지 않았다. Playwright는 합성 인증/API 응답과 실제 fetch SSE 파서·종료/재연결 흐름을 사용한다. 실제 DB의 두 사용자 간 운영 연동 시험을 수행한 것으로 해석하지 않는다. 서버 소유자 격리·commit/rollback은 별도 서버 테스트로 검증했다.
- 초기 40개 MUI 항목의 알림함 테스트가 병렬 실행에서 5초를 초과했다. 단독 실행에서 기능 통과를 확인하고, 동일한 두 페이지 경계를 검증하는 21개 항목으로 줄여 제한 시간을 해당 테스트에만 적용했다.

## 스크린샷

| 너비 | 쪽지·답장·스크롤 보존 | 열린 알림 갱신 |
|---|---|---|
| 375px | [쪽지](screenshots/realtime-chat-375px.png) | [알림](screenshots/realtime-notifications-375px.png) |
| 768px | [쪽지](screenshots/realtime-chat-768px.png) | [알림](screenshots/realtime-notifications-768px.png) |
| 1280px | [쪽지](screenshots/realtime-chat-1280px.png) | [알림](screenshots/realtime-notifications-1280px.png) |

## DB 확인과 운영 경계

- 기본 `s-erp-postgresql-readonly` MCP의 `list_tables` → `describe_table`을 직접 호출해 `tb_notification`, `tb_direct_message`, `tb_direct_message_thread`의 소유자·참여자·읽음·숨김 관련 metadata를 확인했다.
- 자격 증명이나 테넌트 데이터 행을 조회·기록하지 않았다. SQL/테이블/컬럼/스키마 변경과 DDL 적용은 없으므로 migration/rollback 스크립트 추가는 없다.
- SSE registry는 단일 JVM 내부다. 별도 브로커 없이 다른 JVM에서 발생한 변경의 즉시 fan-out을 보장하지 않는다. 해당 환경에서는 표시 중인 클라이언트의 30초 REST 재동기화로 수렴한다. 오프라인이나 조회 실패 중 즉시 반영은 보장하지 않는다.
- 운영 프록시는 SSE streaming을 허용해야 한다. buffering·무응답에는 재연결과 REST 재동기화를 적용하지만 실시간 전달을 보장하지 않는다.
- 웹 푸시/Service Worker/OS 알림, 신규 업무 이벤트와 검색 대상 확대는 이번 구현에 포함하지 않는다. 다음 단계는 [로드맵](../../../plan/20261102/20261102_007_공통기능_후속확장_계획서.md)의 웹 푸시 설계다.
