# 공통 알림·쪽지함 통합 작업 결과

## 구현 및 수정

- 공통 알림과 1:1 쪽지는 별도의 읽음 상태를 유지하고, 쪽지 대화를 읽을 때 연결된 쪽지 알림을 함께 읽음 처리한다.
- 전자결재 댓글 `@사용자`/`@ALL` 멘션 UI와 알림 이동 흐름을 연결했다.
- 브라우저 재현 중 멘션 선택기가 보이지 않는 원인은 `TiptapCommentThread`가 `enableMentions`와 `mentionOptions`를 하위 편집기에 전달하지 않은 것이었다. 두 props를 전달하고 임시 진단 로그를 제거했다.
- 승인 댓글 알림은 `sourceId`에 댓글 ID, `targetId`에 승인 문서 ID를 사용해 문서 상세로 이동한다.
- 375px 화면에서 쪽지 작성 버튼 레이블이 두 줄로 접히는 현상을 확인해 버튼 너비와 줄바꿈을 고정했다.

### 추가 수정 (새 쪽지 저장 오류·UI 통일)

- **버그**: 새 쪽지 저장 후 보낸함 재조회(`DirectMessageServiceImpl.listThreads`)에서 `Error attempting to get column 'updatedat' ... SQLFeatureNotSupportedException` 발생.
  - 원인: 쪽지/알림 VO가 `LocalDateTime`을 사용하는데 MyBatis 기본 `LocalDateTimeTypeHandler`는 `rs.getObject(label, LocalDateTime.class)`를 호출하고, log4jdbc `ResultSetSpy`가 이를 지원하지 않는다. 쓰기(INSERT)는 성공하고 목록 조회 매핑에서 실패했다.
  - 조치: 기존 `LocalDate` 처리와 같은 방식으로 이미 존재하던 `LocalDateTimeTimestampTypeHandler`(getTimestamp 기반)를 `mapper-config.xml`에 전역 등록했다. `LocalDateTime`을 사용하는 VO는 알림·쪽지 VO뿐이라 다른 매퍼 영향은 없다. JSON 응답은 기존 Spring Jackson 설정대로 ISO 문자열을 유지한다.
  - 회귀 테스트: `LocalDateTimeTimestampTypeHandlerTest.mapperConfig_registersLocalDateTimeHandler` (수정 전 실패: 기본 `LocalDateTimeTypeHandler` 반환 → 수정 후 통과).
- 새 쪽지 모달을 공통 `CommonDialog`로 변경하고 버튼을 `보내기` → `취소` 순으로 배치했다(모바일 전체 화면).
- 알림함·쪽지함은 공통 `InboxPageLayout`(셸, 필터 토글, 패널, 목록 항목, 일시 포맷)으로 헤더/필터/목록/미읽음 표시 스타일을 통일했다.
- 헤더 알림·쪽지 카운터 뱃지를 공통 `headerCounterBadgeSx`(16px 높이, 10px 글자)로 작게 표시했다. 브라우저 테스트가 두 뱃지의 높이 ≤16px, 글자 ≤10px를 검증한다(스타일 제거 시 실패 확인).

## 검증

| 검증 | 결과 |
|---|---|
| `node tests/comment-thread-mentions.browser.mjs` | 375/768/1280px 모두 통과; 사용자/`@ALL` 선택 payload 확인 |
| `node tests/notification-message-screenshots.browser.mjs` | 375/768/1280px 모두 통과; 팝오버, 알림함, 쪽지 목록/상세와 가로 넘침 확인 |
| `npm run test -- tests/document-approval-service.test.ts tests/notification-service.test.ts tests/message-service.test.ts` | 41 tests 통과 |
| `npm run test -- tests/document-link-navigation.test.tsx` | 5 tests 통과; 알림의 승인 문서 ID로 상세 열기 확인 |
| `mvn -f backend/pom.xml '-Dtest=NotificationServiceImplTest,DirectMessageServiceImplTest,DocumentApprovalInteractionServiceImplTest' test` | 67 tests 통과 |
| `npm run build` | 통과 |
| `npm run lint -- src/shared/components/feed/TiptapCommentThread.tsx` | 오류 없이 완료; 기존 파일 경고 출력 |
| `git diff --check` | 통과 |
| `mvn test '-Dtest=LocalDateTimeTimestampTypeHandlerTest,LocalDateDateTypeHandlerTest,NotificationServiceImplTest,DirectMessageServiceImplTest'` (추가 수정) | 18 tests 통과 |
| `mvn test '-Dtest=DocumentApprovalInteractionServiceImplTest'` (추가 수정) | 57 tests 통과 |
| `npx vitest run tests/message-inbox.test.tsx tests/notification-center.test.tsx` (추가 수정) | 4 tests 통과; 새 쪽지 공통 다이얼로그 버튼 순서 `보내기, 취소` 확인 |
| `node tests/notification-message-screenshots.browser.mjs` (추가 수정) | 375/768/1280px 통과; 새 쪽지 다이얼로그 버튼 순서와 가로 넘침 확인 |
| `npm run build` (추가 수정) | 통과 |

별도 실행한 넓은 프론트엔드 검증 `npm run test -- tests/document-write-page.test.tsx tests/notification-center.test.tsx tests/message-inbox.test.tsx`에서는 알림/쪽지 페이지 테스트 3개가 통과했으나 `document-write-page.test.tsx`에서 142개 중 44개가 실패했다. 실패는 문서 목록/피드 렌더링 및 로딩 mock 기대값 등 페이지 테스트에 집중되어 있어 이번 멘션 props 전달 수정과 분리해 미해결로 기록한다. 앞선 전체 Maven 실행에서도 기존 승인 테스트 5개가 `addDocumentReferences`를 찾지 못해 실패했으며, 위의 집중 백엔드 검증은 통과했다.

### 후속 수정: 쪽지 대화 높이와 스크롤

- 쪽지함에만 `InboxPageShell`의 가용 높이 채움 모드를 적용했다. 페이지 자체의 세로 넘침을 막고, 좌측 대화 목록 및 우측 메시지 내역은 내부 스크롤을 사용한다.
- 대화 헤더와 답장 폼은 채팅 패널 바깥에 유지하고 메시지 내역만 스크롤되게 했다. 작은 화면의 목록/상세 전환 동작은 유지한다.
- 브라우저 테스트는 메시지 50개를 사용해 375/768/1280px에서 페이지 전체 스크롤이 생기지 않고, 메시지 영역은 내부 스크롤되며 전송 폼이 패널 안에 남는지 확인한다.
- 쪽지 삭제는 이 시점의 승인 범위에서 제외되었다(이후 "대화방 삭제" 후속 수정에서 본인에게만 숨기는 방식으로 추가).

| 검증 | 결과 |
|---|---|
| `npx vitest run tests/message-inbox.test.tsx` | 6 tests 통과 |
| `node tests/notification-message-screenshots.browser.mjs` | 375/768/1280px 통과; 세로 페이지 넘침 없음, 채팅 내부 스크롤, 전송 폼 가시성 확인 |
| `npm run build` | 통과 |
| oxlint 변경 파일 검사 | 종료 코드 0; `MessageInboxPage.tsx`의 기존 effect dependency 경고 1건 |
| 쪽지 대화 높이/스크롤 스크린샷 | [375px](screenshots/message-layout-375.png), [768px](screenshots/message-layout-768.png), [1280px](screenshots/message-layout-1280.png) |

### 후속 수정: 멘션 필터·강조, 알림 이동, 메신저형 쪽지함

- **멘션 강조**: 저장된 댓글의 `@사용자`/`@ALL`을 `commentMentions.ts`에서 `.comment-mention`(primary 배경, 굵은 글자)으로 감싸 표시한다.
- **알림 클릭 시 페이지 없음**: 댓글 멘션 알림 링크가 메뉴에 없는 경로로 생성되어 "요청한 페이지를 찾을 수 없습니다"가 표시되었다. 읽기 전용 MCP로 `tb_menu`의 실제 경로 `/groupware/doc/write`를 확인하고 `?approvalId={targetId}`로 이동하도록 수정했다.
- **`@관리` 필터 불가**: MUI `Menu`가 열리면서 편집기 포커스를 가져가 추가 입력이 되지 않았다. 포커스를 유지하는 `Popper` listbox로 교체하고 순수 함수 `filterMentionCandidates`(이름/부서, 접두 일치 우선)와 ↑/↓/Enter/Tab/Esc 키 처리를 추가했다.
- **카카오톡형 쪽지함**: `MessageThreadListItem`(프로필, 이름, 2줄 미리보기, 축약 시각, 미읽음 뱃지)과 `MessageChatView`(내 메시지 우측·상대 좌측, 분 단위 그룹, 미읽음 `1`, 날짜 구분선, 자동 하단 스크롤)를 추가했다. 색상은 카카오톡이 아닌 S-ERP primary 테마를 사용한다.
- **답장 입력**: 댓글 입력창 구조(상단 입력, 하단 우측 `전송`)로 변경했다. Enter 전송, Shift+Enter 줄바꿈, 한글 조합 중 Enter 무시. 첨부는 미지원.
- **전송 시 깜빡임**: 답장 후 재조회를 silent 모드로 바꾸고, 새 쪽지 전송 시 보낸함 목록과 대화를 미리 조회해 한 번에 전환하도록 했다.
- **프로필 사진**: `selectThreads`에 `tb_login_account.profile_image`를 LEFT JOIN해 `otherUserProfileImage`로 반환하고, 사진이 없거나 로드 실패 시 이니셜을 표시한다. 스키마 변경이 없어 SQL 이력 파일은 추가하지 않았다.

| 검증 | 결과 |
|---|---|
| `npx vitest run tests/message-inbox.test.tsx tests/comment-mention-highlight.test.ts tests/notification-center.test.tsx tests/feed-components.test.tsx` | 4 files, 62 tests 통과 (목록/채팅/조용한 로딩/프로필 사진/멘션 필터 테스트는 구현 전 실패 확인) |
| `mvn -q test '-Dtest=DirectMessageMapperXmlTest,DirectMessageServiceImplTest,LocalDateTimeTimestampTypeHandlerTest'` | 통과 (`DirectMessageMapperXmlTest`는 매퍼 수정 전 실패 확인) |
| `node --test tests/comment-thread-mentions.browser.mjs` | 375/768/1280px 3/3 통과; `@관리` 입력 유지, 관리자만 표시, Enter 선택, payload `[7]`, `@관리자` 강조 확인 |
| `node --test tests/notification-message-screenshots.browser.mjs` | 375/768/1280px 3/3 통과; 보낸 말풍선 우측·받은 말풍선 좌측 정렬, 전송 버튼이 입력 하단 우측, 페이지 넘침 없음 확인 |
| `npm run build` | 통과 |
| oxlint 변경 파일 | 오류 0; 기존 경고(`MessageInboxPage` effect dependency, `TiptapCommentThread` 기존 경고 4건)만 출력 |
| `git diff --check` | 통과 |

스크린샷: [멘션 필터 768px](screenshots/comment-mention-filter-768.png), [쪽지 대화 1280px](screenshots/message-detail-1280.png), [쪽지 대화 375px](screenshots/message-detail-375.png), [쪽지 목록 1280px](screenshots/message-inbox-1280.png) (각 375/768/1280px 파일 함께 보관).

DB 확인(읽기 전용 MCP): `tb_login_account.profile_image`(text)와 `tb_user`의 `tenant_id`, `login_id` 컬럼 메타데이터를 확인했고, 조인 가능 여부는 개수 집계 쿼리로만 확인했다(개별 행·이미지 값은 조회/기록하지 않음). `tb_menu`에서 문서작성 메뉴 경로를 확인했다. DB 쓰기는 없다.

### 후속 수정: 멘션 권한 오류, 대화 일자별 페이징, 헤더 프로필, 받은함/보낸함 통합

- **"문서에 접근할 수 없는 사용자는 멘션할 수 없습니다" 오류**
  - 재현 조건: 문서 접근 권한이 있는 사용자를 `@`로 태그하고 저장.
  - 원인 분석(읽기 전용 MCP): 서버의 수신 대상 쿼리를 대상 문서에 실행하면 해당 사용자가 포함되고, 기안자/참여자 ID 컬럼 값도 서로 일치했다. 즉 서버 권한 검사는 정상이었다. 원인은 프런트엔드였다.
    - 멘션 후보에 문서 접근 대상이 아닌 테넌트 전체 사용자가 노출되었다.
    - 본문에서 지운 멘션이나 저장 실패 후 남은 `mentionedUserIds` 상태(stale ID)가 그대로 전송되었다.
  - 해결:
    - 서버에 `GET /api/v1/groupware/approvals/{id}/comments/mention-users`(문서 접근 대상자 − 작성자)를 추가하고, 피드는 이 목록으로 멘션 후보를 제한한다.
    - 저장 시 `resolveSubmittedMentions`가 본문에 실제 남은 `@이름`/`@ALL`만 전송한다.
- **일자별 대화 페이징**
  - `GET /messages/threads/{id}?beforeDate=`가 하루치 `{ resultList, messageDate, hasPrevious }`를 반환한다. 기존 `LIMIT 100`은 제거했다.
  - 대화를 열면 최근 날짜(당일)만 조회한다. 상단으로 스크롤하면 이전 하루치를 앞에 붙이고, 보던 위치를 유지한다(높이 증가분만큼 `scrollTop` 보정).
  - 스크롤이 생기지 않을 만큼 짧으면 화면이 찰 때까지 자동으로 더 조회한다.
  - 답장 후에는 최신 날짜만 재조회해 이미 불러온 이전 날짜와 병합한다.
- **헤더 프로필**: 대화 상세 헤더의 상대 이름 왼쪽에 `ProfileAvatar`를 표시한다. 사진이 있으면 사진, 없거나 로드에 실패하면 이니셜.
- **받은함/보낸함 통합**
  - 1:1 대화는 이미 양방향 메시지를 한 대화에 담고 있다. 서버에 `folder=ALL`(기본값)을 추가하고 화면 토글을 제거해 카카오톡처럼 상대별 단일 목록(최근 활동순)으로 표시한다.
  - 새 쪽지 전송 후에도 같은 목록에서 해당 대화가 바로 열린다.
  - `INBOX`/`SENT`는 API 호환용으로 남겼다.
- 스키마 변경은 없다. 신규 쿼리는 기존 `tb_direct_message`의 `created_at`, `thread_id`, `tenant_id`만 사용한다.
- 반영하려면 백엔드 재시작이 필요하다.

| 검증 | 결과 |
|---|---|
| `mvn -q test '-Dtest=DirectMessageServiceImplTest,DirectMessageMapperXmlTest,DocumentApprovalInteractionServiceImplTest,DocumentApprovalInteractionApiControllerTest,LocalDateTimeTimestampTypeHandlerTest'` | 종료 코드 0. 일자 페이징/ALL/멘션 대상 테스트는 구현 전 컴파일 실패(red)를 확인했다. |
| `npx vitest run tests/message-inbox.test.tsx tests/message-service.test.ts tests/comment-mention-highlight.test.ts tests/document-approval-service.test.ts tests/notification-center.test.tsx tests/feed-components.test.tsx` | 6 files, 109 tests 통과. 신규 페이징/헤더/통합/서비스/stale 멘션 테스트는 구현 전 실패를 확인했다. |
| `npx vitest run tests/document-write-page.test.tsx` | 기존 실패 44건, 변경 전과 동일. 신규 실패 없음. |
| `node --test tests/notification-message-screenshots.browser.mjs` | 375/768/1280px 3/3 통과. 토글 없음, 헤더 이니셜, 상단 스크롤 시 이전 날짜 로드(날짜 구분선 2개), 스크롤 위치 유지를 확인했다. |
| `node --test tests/comment-thread-mentions.browser.mjs` | 375/768/1280px 3/3 통과 |
| `npm run build` | 통과 |
| oxlint 변경 파일 | 오류 0. `MessageInboxPage`의 기존 effect 관련 경고만 있다. |
| `git diff --check` | 통과 |

스크린샷: [이전 날짜 로드 1280px](screenshots/message-previous-day-1280.png), [768px](screenshots/message-previous-day-768.png), [375px](screenshots/message-previous-day-375.png), [통합 목록 1280px](screenshots/message-inbox-1280.png).

DB 확인(읽기 전용 MCP): 대상 문서의 멘션 수신 대상 집합과 ID 컬럼 일치 여부는 집계/ID 비교로만 확인했다. 이름 등 개인정보 행 값은 문서에 기록하지 않았다. DB 쓰기는 없다.

### 후속 수정: 대화방 삭제(본인에게만 숨김, 새 쪽지 시 재활성화)

- **사용 방법**: 대화 상세 헤더 우측 휴지통(`대화방 삭제`) → 확인 다이얼로그 `삭제`. 목록에서 즉시 사라지고 헤더 쪽지 카운터가 갱신된다.
- **범위**: 본인에게만 숨긴다. `tb_direct_message_thread.participant_a/b_hidden_at` 중 본인 쪽에 삭제 시각을 기록하며, 상대방 쪽지함과 메시지 row는 그대로다. 삭제 시 받은 미읽음 쪽지와 새 쪽지 알림은 읽음 처리한다.
- **재활성화**: 삭제 이후 메시지가 생기면 목록에 다시 나타나고, 삭제 시각 이후 메시지만 보인다(이전 날짜 페이징·알림 링크도 삭제 시각 이전은 제외).
- **DB 변경**: `20261030_009` migration/rollback/변경 이력을 `docs/database/20261030`, `backend/DATABASE/20261030`에 동일하게 추가하고 `db-schema.md`를 갱신했다. **실제 DB에는 적용하지 않았으므로 migration 적용 후 백엔드 재시작이 필요하다**(미적용 상태에서는 쪽지함 조회 쿼리가 새 컬럼을 참조해 실패한다).
- 새 쪽지 작성은 기존처럼 매번 새 대화를 만든다. 같은 상대와의 기존 대화 재사용은 이번 범위에 포함하지 않았다.

| 검증 | 결과 |
|---|---|
| `mvn -q test '-Dtest=DirectMessageMapperXmlTest,DirectMessageServiceImplTest'` | 종료 코드 0. 숨김/재활성화/404/`visibleAfter` 테스트는 구현 전 컴파일 실패(red) 확인 |
| `npx vitest run tests/message-inbox.test.tsx tests/message-service.test.ts` | 구현 전 3건 실패(red) → 18 tests 통과 |
| `npx vitest run` (쪽지/알림/피드/멘션/결재 서비스 6 files) | 112 tests 통과 |
| `node --test tests/notification-message-screenshots.browser.mjs` | 375/768/1280px 3/3 통과; 삭제 확인 다이얼로그 버튼 순서 `삭제`, `취소` 확인 |
| `npm run build` | 통과 |
| oxlint 변경 파일 | 오류 0; `MessageInboxPage`의 기존 effect 관련 경고 2건만 출력 |
| `git diff --check` | 통과 |

스크린샷: [삭제 확인 1280px](screenshots/message-delete-confirm-1280.png), [768px](screenshots/message-delete-confirm-768.png), [375px](screenshots/message-delete-confirm-375.png).

DB 확인(읽기 전용 MCP): `describe_table(tb_direct_message_thread)`로 현재 컬럼(`thread_id`, `tenant_id`, `participant_a_user_id`, `participant_b_user_id`, `subject`, `created_at`, `updated_at`)과 숨김 컬럼 부재를 확인했다. 행 데이터는 조회하지 않았고 DB 쓰기는 없다.

### 후속 수정: 새 쪽지 받는 사람 검색·프로필

- 받는 사람 select를 검색 가능한 `MessageRecipientSelect`(Autocomplete)로 교체했다. 이름·부서로 필터하며 이름 접두 일치를 우선한다.
- 후보와 선택값에 프로필 사진을 표시하고, 사진이 없거나 로드 실패 시 이니셜을 표시한다. 기존 사용자 목록 API의 `profileImage`를 사용하므로 API/DB 변경은 없다.

| 검증 | 결과 |
|---|---|
| `npx vitest run tests/message-inbox.test.tsx tests/message-service.test.ts` | 구현 전 신규 테스트 실패(red) → 19 tests 통과 (`관리` 검색 시 관리자·김철수만, 이니셜/사진, 선택 후 `recipientUserId: 22` 전송) |
| `node --test tests/notification-message-screenshots.browser.mjs` | 375/768/1280px 3/3 통과; 실제 입력 `관리`로 후보 2건 확인 |
| `npm run build` | 통과 |
| oxlint 변경 파일 | 오류 0; `MessageInboxPage`의 기존 effect 관련 경고 2건만 출력 |

스크린샷: [받는 사람 검색 768px](screenshots/message-compose-recipient-search-768.png), [375px](screenshots/message-compose-recipient-search-375.png), [1280px](screenshots/message-compose-recipient-search-1280.png).

### 후속 수정: 화면 복귀 시 대화방 조용한 갱신

- 탭 복귀(`visibilitychange` visible)·창 포커스 시 대화 목록과 열린 대화의 최신 일자 메시지를 스피너 없이 병합 갱신한다. 안 읽은 쪽지는 읽음 처리하고 `s-erp:message-read`로 헤더 배지를 맞춘다.
- `sendReply`도 같은 최신 일자 병합 함수(`mergeLatestThreadDay`)를 사용한다. 백엔드/DB 변경 없음.

| 검증 | 결과 |
|---|---|
| `npx vitest run tests/message-inbox.test.tsx tests/message-service.test.ts` | 구현 전 신규 테스트 실패(red) → 20 tests 통과 (스피너 없음, 새 메시지 표시, 읽음 처리·이벤트) |
| `node --test tests/notification-message-screenshots.browser.mjs` | 3/3 통과 (동작 변경만이라 신규 캡처 없음) |
| `npm run build` | 통과 |
| oxlint `src/pages/groupware/messages` | 오류 0; 기존 effect 관련 경고 2건만 출력 |

### 후속 수정: 채팅방 문서·공지 공유 링크와 OG 미리보기

- 말풍선 안 URL을 링크로 표시(내부 링크는 라우터 이동, 외부 링크는 새 탭)하고, 말풍선 아래에 문서·공지·외부 OG 미리보기 카드를 표시한다. 기존 `DocumentLinkPreviews`/`FeedLinkPreviews`를 재사용했다(`testId` 옵션만 추가).
- 카드 로드로 대화 높이가 늘어나도 하단에 있던 사용자는 하단을 유지한다. 백엔드/DB 변경 없음.

| 검증 | 결과 |
|---|---|
| `npx vitest run tests/message-chat-links.test.tsx` | 구현 전 실패(red) → 2 tests 통과 (링크화, HTML 미해석, 문서·공지·OG 카드, 평문 시 미표시) |
| `npx vitest run tests/message-chat-links.test.tsx tests/message-inbox.test.tsx tests/message-service.test.ts tests/feed-link-previews.test.tsx` | 26 tests 통과 |
| 링크 관련 테스트 묶음 | 기존 실패인 `document-link-content` 3건 외 통과 |
| `node --test tests/notification-message-screenshots.browser.mjs` | 375/768/1280px 3/3 통과 (카드 표시, 외부 링크 새 탭, 카드 로드 후 하단 유지) |
| `npm run build` | 통과 |
| oxlint 변경 파일 | 오류 0; 기존 경고 2건만 출력 |

스크린샷: [링크 미리보기 768px](screenshots/message-link-preview-768.png), [375px](screenshots/message-link-preview-375.png), [1280px](screenshots/message-link-preview-1280.png).

## 브라우저 캡처

`screenshots/`의 이미지는 375px, 768px, 1280px 뷰포트에서 Vite 브라우저 테스트 하네스와 대표 mock 응답으로 생성했다. 인증된 사용자 세션이나 실데이터를 사용하지 않았다.

- `comment-mention-{375,768,1280}.png`
- `notification-popover-{375,768,1280}.png`
- `notification-inbox-{375,768,1280}.png`
- `message-inbox-{375,768,1280}.png`
- `message-detail-{375,768,1280}.png`
- `message-previous-day-{375,768,1280}.png` (상단 스크롤 시 이전 날짜 로드, 헤더 프로필)
- `message-compose-{375,768,1280}.png` (공통 다이얼로그, 보내기/취소)
- `message-delete-confirm-{375,768,1280}.png` (대화방 삭제 확인)
- `message-compose-recipient-search-{375,768,1280}.png` (받는 사람 `관리` 검색, 프로필 이니셜)

## DB 확인

읽기 전용 `s-erp-postgresql-readonly` MCP로 public 테이블 목록과 `tb_notification`, `tb_direct_message_thread`, `tb_direct_message`의 컬럼, FK/CHECK/UNIQUE 제약 및 인덱스 메타데이터를 확인했다. 세 테이블은 이미 존재하고 현재 정의는 `20261030_005` DDL 초안과 일치한다. 행 데이터는 조회하지 않았고 DB에 쓰기나 migration 적용은 하지 않았다. 이 초안과 rollback은 현재 DB에 실행하지 않는다.

관련 계획/사양 및 날짜별 스키마 기록은 [작업지시서](../../../directions/20261030/20261030_005_공통알림_쪽지함_통합_작업지시서.md), [상세사양서](../../../spec/20261030/20261030_005_공통알림_쪽지함_통합_상세사양서.md), [스키마 변경 이력](../../../database/20261030/20261030_005_change_notification_message_schema.md)을 참고한다.
