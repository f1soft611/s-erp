# 로그인 공지 팝업 구현 결과

## 1. 범위와 상태

- 기준: [작업지시서](../../../directions/20261022/20261022_004_notice_login_popup_work_instruction.md), [계획서](../../../plan/20261022/20261022_004_notice_login_popup_plan.md), [상세 사양](../../../spec/20261022/20261022_004_notice_login_popup_spec.md).
- 작성 화면, 설정 저장 계약, 팝업 API, 로그인 큐 및 회귀 테스트를 구현했다.
- **실제 DB 마이그레이션은 적용하지 않았다. 실행 중 백엔드는 재시작/재배포하지 않았다. 브라우저 검증은 격리된 컨텍스트와 합성 API 응답으로 수행했다.**
- 기존 4173 개발 서버를 재사용했으며 종료하지 않았다. 시안 전용 임시 서버는 종료했다.
- 다른 작업의 그리드/날짜 입력/검색 영역/결재 문서 변경은 수정하지 않았다. 커밋하지 않았다.

## 2. 구현 동작

### 공지 작성·편집

다음 순서를 적용했다.

```text
구분
로그인 시 팝업    팝업 종료일
제목
내용
```

- 600px 미만에서 설정 두 필드는 세로 배치한다.
- 구분·종료일·제목은 테두리와 라벨이 있는 입력으로 표시한다. 기존 제목의 크기·굵기를 유지한다.
- 활성화 시 종료일 필수. 서버는 Y/N 및 실제 날짜를 검사하고, 비활성화하면 종료일을 null로 저장한다.
- 등록/수정 요청, 목록/상세 응답, 피드 어댑터, 양쪽 편집 진입 경로에 설정을 연결했다.

### 로그인 팝업

- 유효한 공지만 최신순으로 한 건씩 표시한다. 종료일 당일까지 포함하며 서버 한국 날짜를 사용한다.
- 현재 공지의 제목·작성자·작성일·정제된 본문·인증 이미지·첨부 다운로드를 제공한다.
- 큐 목록은 조회수를 변경하지 않는다. 현재 공지의 상세 조회만 기존 공지의 사용자별 최초 1회 조회수 처리를 재사용한다.
- ‘오늘 하루 이 공지 보지 않기’는 현재 사용자·현재 공지에만 적용한다. 서버 저장 성공 후 다음으로 넘어간다.
- 하루 숨김은 서버 저장이다. 브라우저 sessionStorage는 로그인 세션별 큐/진행 위치만 보관한다.
- 새로고침과 메뉴 이동 후 진행 위치를 복원한다. 실제 재로그인에는 새 큐 ID를 만들고 토큰 갱신에서는 ID를 유지한다.
- 목록/상세/숨김 실패는 오류와 재시도를 제공한다. 만료·삭제된 공지는 안내 후 건너뛸 수 있다. 팝업 오류로 로그인 성공 자체를 취소하지 않는다.
- 본문 이미지 실패 재시도 및 blob URL 정리를 제공한다. 인증 요청은 현재 공지의 API origin/경로로 제한한다.
- HTTP 환경에서도 사용할 수 있는 `crypto.getRandomValues`로 큐 ID를 생성한다. 진행 저장소 정리 실패가 로그아웃을 막지 않도록 경고 후 기존 인증 해제를 계속한다.

## 3. API·스키마

공통 경로: `/api/v1/groupware/boards/notice/login-popups`

| Method | 경로 | 처리 |
|---|---|---|
| GET | 공통 경로 | 유효 공지 메타데이터 목록, 조회수 미집계 |
| GET | `/{postId}` | 유효성 재검사 후 기존 상세/최초 조회수 로직 |
| PUT | `/{postId}/dismiss-today` | 인증 사용자 기준 한국 날짜 숨김 upsert |

tenant 및 로그인 계정은 인증 컨텍스트에서 얻는다. 클라이언트가 전달한 tenant/계정 파라미터로 대상을 바꾸지 않는다.

스키마 준비:

- `tb_board_post.login_popup_yn`, `popup_end_date`.
- `tb_notice_popup_dismissal`: `(tenant_id, post_id, login_id)` PK, 숨김 날짜, FK.
- 활성 공지 검색용 부분 인덱스.
- [적용 SQL](../../../database/20261022/20261022_004_notice_login_popup.sql), [롤백 SQL](../../../database/20261022/20261022_004_rollback.sql), [변경 이력](../../../database/20261022/20261022_004_notice_login_popup_change_schema.md).
- 같은 세 파일을 `backend/DATABASE/20261022`에 동일하게 유지했다. SHA-256 비교 일치 확인.
- [누적 스키마](../../../database/db-schema.md)에도 **미적용 예정 변경**으로 표시했다.

## 4. DB MCP 확인 근거

2026-10-22 기본 `s-erp-postgresql-readonly`에서 다음을 직접 수행했다.

1. `list_tables`.
2. `describe_table`: `tb_board_post`, `tb_board_post_view_history`, `tb_login_account`.
3. 제한된 제약 메타데이터 SELECT.

확인 사항:

- 게시글과 로그인 계정의 bigint 식별자 및 tenant 범위.
- 기존 조회 이력의 `(tenant_id, post_id, login_id)` 유일성.
- 기존 게시글 본문·구분·고정 필드와 조회수 계약.
- 확인 시점에 신규 팝업 컬럼/숨김 테이블은 없었다.

개인정보·계정·인증·tenant 데이터 행이나 자격 증명은 조회·출력하지 않았다. `.env`를 열람하지 않았다. 읽기 전용 MCP로 DDL을 실행하지 않았다.

## 5. 자동 검증

### 백엔드: 39개 통과

```powershell
cd backend
mvn "-Dtest=NoticeLoginPopupApiControllerTest,NoticeLoginPopupServiceTest,NoticePopupSettingsTest,NoticeBoardServiceImplTest,NoticeBoardTenantScopeMapperTest" test
```

| 테스트 | 개수 | 주요 확인 |
|---|---:|---|
| 팝업 컨트롤러 | 2 | 응답 envelope/경로, 인증 없는 요청 401, 인증 tenant/사용자 사용 |
| 팝업 서비스 | 7 | 목록 무집계, 현재 공지 상세 위임, 비유효 공지 404, 숨김, 계정 확인, 한국 자정 직전·직후 |
| 저장 설정 | 3 | 등록·편집 파라미터, 필수·잘못된 날짜/연도 0000 거부, 비활성 날짜 제거 |
| 기존 공지 서비스 | 24 | 기존 저장·상세·사용자별 최초 조회수 등 회귀 |
| 공지 매퍼 | 3 | tenant/공지 범위, 기간·개별숨김 조건, 설정 컬럼, upsert |

서비스는 DAO mock, 컨트롤러는 MockMvc, 매퍼는 SQL 생성 계약 검증이다. 실제 PostgreSQL에서 migration/upsert/조회수를 실행한 통합 테스트가 아니다.

### 프론트엔드: 집중 테스트 41개 통과

```powershell
cd frontend
npm run test -- tests\notice-login-popup.test.tsx tests\notice-login-popup-service.test.ts tests\notice-popup-auth-session.test.ts tests\notice-popup-body.test.tsx tests\notice-composer-dialog-theme.test.tsx tests\notice-board-service.test.ts tests\use-notice-mutations.test.tsx tests\notice-post-adapter.test.ts tests\use-notice-interactions.test.tsx
npm run build
```

- 9개 테스트 파일, 41개 통과.
- 순차 상세 요청/현재 공지만 숨김, 숨김 실패/재시도, 404 건너뛰기, 진행 위치·완료 상태 복원, 재로그인, 로그아웃 후 늦은 응답 폐기.
- 작성 필드 순서·테두리, 날짜 필수, 편집 초기값, 비활성 날짜 제거, 저장 요청 전달, 제목 테마 회귀.
- API 응답 검증, 로그인/토큰 갱신의 큐 ID 수명, HTTP 호환성, 저장소 정리 실패, 인증 이미지 재시도/외부 URL 처리/URL 해제.
- TypeScript + Vite production build 성공. 기존 큰 번들 경고는 유지된다.
- 변경 프론트 파일에 대한 oxlint 실행: 오류 0. 기존 작성창의 초기화 effect/의존성·혼합 export 및 공지 페이지 effect 경고는 남아 있으며 이번 설정 초기값도 기존 초기화 패턴을 따른다.
- 백엔드와 대규모 병렬 실행 중 신규 팝업 테스트의 기본 대기시간 초과 1회가 있었다. 당시 DOM은 로딩 상태였으며 프론트 단독 재실행에서는 41개 모두 통과했다. 제품 코드를 임의의 지연/재시도 우회로 바꾸지 않았다.

### 기존 실패 분리

아래 실패는 변경 전 HEAD의 프론트 스냅샷에서도 동일하게 재현했다. 이번 기능과 무관한 기대값/기존 화면 동작은 수정하지 않았다.

| 파일 | 기존 실패 | 비교 결과 |
|---|---:|---|
| `login.test.tsx` | 2 | dashboard ‘종합현황’ heading 조회 실패가 HEAD에서도 동일 |
| `notice-page.test.tsx` | 1 | 초기 notice-feed-skeleton 기대 실패가 HEAD에서도 동일 |
| `notice-page-local-updates.test.tsx` | 16 | 공지 텍스트 중복 매칭 및 기존 댓글/로컬 갱신 실패가 HEAD에서도 동일, 나머지 19개 통과 |

따라서 전체 테스트가 모두 성공했다고 주장하지 않는다.

## 6. 브라우저 검증과 스크린샷

실제 앱 `http://127.0.0.1:4173`에 격리된 Playwright 컨텍스트와 합성 인증/메뉴/공지 API를 사용했다. 실제 사용자 저장소나 데이터를 읽지 않았다.

375/768/1280px 모두 확인:

- 첫 번째 공지를 확인하기 전 두 번째 상세를 요청하지 않음.
- 현재 공지만 하루 숨김 요청, 다음 공지 체크 해제.
- 새로고침 시 목록을 다시 요청하지 않고 진행 중 공지 복원.
- 승인 필드 순서 및 모바일 세로/태블릿·데스크톱 2열 배치.
- 비활성 날짜 입력, 날짜 필수 오류, 활성 설정/종료일 저장 요청.
- 페이지와 모달의 실제 `scrollWidth/clientWidth` 및 모달 경계 검사: 가로 넘침 없음.
- 목록 오류 재시도, 기간 종료 상세 건너뛰기, 숨김 실패 시 유지 후 재시도.

| 화면 | 모바일 | 태블릿 | 데스크톱 |
|---|---|---|---|
| 작성창 | [375px](screenshots/composer-375.png) | [768px](screenshots/composer-768.png) | [1280px](screenshots/composer-1280.png) |
| 로그인 공지 | [375px](screenshots/popup-375.png) | [768px](screenshots/popup-768.png) | [1280px](screenshots/popup-1280.png) |

- [목록 오류 화면](screenshots/popup-error-375.png).
- [브라우저 측정 결과](screenshots/browser-checks.json).

## 7. 실제 적용 전 남은 단계

1. 담당자가 대상 DB와 백업·배포 순서를 확인한 뒤 적용 SQL을 실행한다.
2. 신규 컬럼/테이블이 반영된 상태에서 백엔드를 배포·재시작하고 프론트엔드를 배포한다. 새 Mapper는 신규 컬럼을 읽으므로 스키마 반영보다 먼저 서버 코드를 배포하면 안 된다.
3. 실제 인증 세션으로 등록·편집, 다중 공지, 종료일 당일/익일, 개인별 하루 숨김, 서로 다른 사용자·tenant 분리, 최초/반복 조회수를 통합 확인한다.
4. 롤백 시 먼저 해당 코드 사용을 중단/이전 버전으로 복귀한 뒤 롤백 SQL을 적용한다. 롤백은 신규 팝업 설정과 숨김 이력을 삭제한다.

실제 DB 적용과 배포 후 통합 검증이 끝나기 전에는 운영 기능 활성화까지 완료된 상태가 아니다.

## 8. 후속 UI 변경: 헤더 진행 표시·작성 정보

이 단계의 한 줄 표시는 아래 9절의 최종 승인 디자인으로 대체되었다.

- 사용자 지시에 따라 상단 '로그인 공지' 바로 아래로 진행 표시(`1 / 1` 등), 작성자, 작성일시를 옮겼다.
- 작성일시는 날짜뿐 아니라 시각까지 표시한다. 본문의 중복 진행/작성 정보는 제거했다.
- 기존 CommonDialog의 description을 재사용하여 공통 컴포넌트와 공지 피드는 수정하지 않았다.
- `notice-login-popup.test.tsx` 11개 통과 및 TypeScript/Vite build 성공. 단일 공지의 헤더 위치, 다중 공지의 진행 갱신, 작성자·시각 표시 및 본문 중복 제거를 검증했다.
- 4173 격리 합성 API 브라우저 테스트에서 375/768/1280px의 헤더 좌표와 가로 넘침을 확인했다. 기존 순차 처리/숨김/재시도 시나리오도 통과했다.
- 단일 공지 변경 화면: [375px](screenshots/popup-single-375.png), [768px](screenshots/popup-single-768.png), [1280px](screenshots/popup-single-1280.png).
- 기존 다중 공지 스크린샷과 브라우저 측정 JSON도 변경된 헤더 기준으로 갱신했다. DB/API 계약 변경은 없다.

## 9. 최종 승인 헤더 디자인: 진행 배지·작성 정보 분리

- 사용자 승인: '추천안: 오른쪽 진행 배지 + 아래 작성 정보 분리'.
- 제목 오른쪽에 연한 파란색 진행 배지를 표시한다. 단일 공지도 `1 / 1`로 유지한다.
- 제목 아래에는 작은 사용자/시계 아이콘 및 '작성자', '작성일시' 라벨을 배치한다. 작성자 값은 굵게, 라벨과 날짜는 차분한 회색으로 표시한다.
- 날짜는 `2026. 10. 22.`, 시각은 `09:00:00`처럼 24시간제로 표시한다. 모바일에서는 작성일시 행을 분리하고 날짜/시각은 각 단위 안에서 잘리지 않도록 한다.
- `CommonDialog`의 선택적 `titleAside`와 ReactNode description을 사용한다. 옵션을 사용하지 않는 기존 모달은 기존 구조/표면/제목 접근성 그대로 유지한다. 공지 피드 파일은 수정하지 않았다.
- 테스트 32개 통과: 팝업 11개, 공통 모달 10개, 기존 작성창 테마 11개. TypeScript/Vite build 성공(기존 큰 번들 경고 유지), 변경 파일 oxlint 오류/경고 없음.
- 375/768/1280px 브라우저에서 진행 배지의 제목 우측 정렬, 작성 정보의 헤더 내 위치, 모바일 작성일시 다음 행 배치, 가로 넘침 없음을 좌표로 검증했다. 기존 순차 표시/개별 숨김/새로고침 복원/오류 재시도도 통과했다.
- 화면: [모바일](screenshots/popup-single-375.png), [태블릿](screenshots/popup-single-768.png), [데스크톱](screenshots/popup-single-1280.png).
- 스크린샷 및 브라우저 측정 JSON은 최종 디자인으로 갱신했다. 실제 DB/API 계약 변경이나 서버 재시작은 없다.

## 10. 피드·리스트의 팝업 상태 아이콘과 분류색 통일

아래 초기 위치 설명은 11절의 후속 최종 배치로 대체되었다. 스크린샷과 브라우저 JSON은 최종 배치로 갱신했다.

### 최종 표시

- 사용자 후속 지시를 반영하여 텍스트 배지 대신 핀 바로 옆에 작은 상태 아이콘만 표시한다. 피드는 기존 핀 버튼 앞, 리스트와 상단 고정 패널은 선두 핀 옆에 배치한다.
- 로그인 팝업 설정 공지는 파란 알림 아이콘, 종료일 다음 날부터 회색 알림 해제 아이콘을 표시한다. 일반 공지는 팝업 아이콘이 없다. 접근성 이름은 각각 '로그인 팝업', '팝업 종료'이다.
- 마우스를 올리면 종료일을 안내한다. 종료일 누락은 누락 안내로 명시하며 개인별 하루 숨김과는 독립적이다. 한국 자정과 탭 복귀 시 상태를 갱신한다.
- 피드·리스트 분류 배지는 `NoticeCategoryBadge`에서 동일한 코드별·테마별 배경색과 글자색을 사용한다. 기존 '필독'의 흰 글자와 피드 28px/리스트 22px 높이를 유지한다.
- 공통 `ListView`/`PinnedItemsPanel`은 선택적 아이콘 렌더러, `ListView`는 추가로 선택적 분류 렌더러를 제공한다. 사용하지 않는 기존 화면의 기본 아이콘/배지와 행 선택 동작은 유지한다.
- 기존 목록 응답의 설정/분류 코드를 어댑터로 보존한다. 아이콘 표시용 상세 API 요청이나 조회수 집계는 없으며 백엔드/DB 계약 변경도 없다.

### 검증

```powershell
cd frontend
npm run test -- tests\notice-login-popup-badge.test.tsx tests\notice-view-adapter.test.ts tests\notice-post-adapter.test.ts tests\common-view-mode.test.tsx tests\notice-category-presentation.test.ts
node .\node_modules\vitest\vitest.mjs run tests\notice-page.test.tsx --testNamePattern=category
npm run build
```

- 집중 테스트 38개 통과: 아이콘 9개, 뷰 어댑터 2개, 게시글 어댑터 2개, 공통 뷰 17개, 분류색 8개. 기존 피드의 light/dark 분류색·고정 상태 회귀 2개도 통과했다.
- 일반/기존 설정 미지정 공지 미표시, 종료일 당일 포함·한국 자정 전환·탭 복귀, 종료일/누락 툴팁, 핀 인접 위치, light/dark의 피드·리스트 배경/글자색 및 높이, 공통 뷰 기본 동작과 선택적 렌더러를 확인했다.
- 테스트를 먼저 실행하여 미구현 분류 컴포넌트 및 아이콘 슬롯의 실패를 확인한 뒤 구현했다.
- TypeScript/Vite 빌드 성공. 기존 큰 번들 경고는 유지된다. 변경 파일 oxlint 오류 0건이며 기존 공지 페이지/피드의 effect·혼합 export 및 뷰 어댑터 테스트의 중복 키 경고는 별도 변경하지 않았다.
- 첫 기존 회귀 실행에서 npm이 `-t`를 소비하여 파일 전체와 분류 테스트가 실행되었다(38개 성공, 기존 skeleton 1개 실패). 위 `node ... --testNamePattern=category`로 정확한 선택자를 전달하여 해당 2개 성공을 확인했다. 전체 테스트가 모두 성공한 것으로 표현하지 않는다.
- 기존 4173 서버를 재사용하고 격리된 브라우저 컨텍스트의 합성 API/인증만 사용했다. 375/768/1280px에서 활성·종료·일반 공지, 고정 패널, 핀 인접, 툴팁, 페이지/목록/행의 가로 넘침 없음과 상세 요청 0건을 확인했다. 실제 computed style의 분류 배경색·글자색이 피드/리스트에서 일치했다.
- 서버 재시작·커밋·DB 실행이나 실제 사용자 데이터 조회는 하지 않았다. 기본 기능의 DB 배포·통합 검증 한계는 7절과 동일하며 이번 UI 작업에서 현재 DB 적용 여부를 새로 확인하지 않았다.

| 화면 | 모바일 | 태블릿 | 데스크톱 |
|---|---|---|---|
| 피드형 | [375px](screenshots/popup-badge-feed-375.png) | [768px](screenshots/popup-badge-feed-768.png) | [1280px](screenshots/popup-badge-feed-1280.png) |
| 리스트형 | [375px](screenshots/popup-badge-list-375.png) | [768px](screenshots/popup-badge-list-768.png) | [1280px](screenshots/popup-badge-list-1280.png) |

[브라우저 측정 결과](screenshots/badge-browser-checks.json)

## 11. 최종 리스트 배치 및 상단 고정 영역 정리

- 사용자 승인 배치: `문서 아이콘 · 제목 … 팝업 아이콘 · 핀 아이콘 · 분류 배지`.
- 선두 문서 아이콘은 문서작성 리스트의 공통 `ListView` 기본 `DescriptionOutlinedIcon`을 그대로 재사용한다. 오른쪽 상태 아이콘은 분류 바로 옆에 묶었으며 제목 말줄임과 기존 행 선택을 유지한다.
- 상단 고정 영역은 로그인 팝업 표시를 제거하고 기존 핀만 표시한다. 피드의 팝업·핀·분류 배지는 그대로 유지한다.
- 불필요해진 상단 전용 아이콘 helper/타입과 `PinnedItemsPanel`의 신규 아이콘 슬롯은 제거하여 공통 패널은 기존 구현으로 유지했다. 백엔드/DB 계약 변경 없음.
- 구현 전 브라우저에서 선두 문서 아이콘 누락과 상단 팝업 표시 잔존의 실패를 각각 확인했다. 최종 공통 뷰 18개·팝업 아이콘 9개 총 27개 테스트 및 TypeScript/Vite 빌드가 통과했다. 큰 번들 경고는 기존과 동일하다.
- 변경 파일 lint 오류 0건, 기존 공지 페이지 effect 의존성 경고 1건은 유지했다.
- 375/768/1280px 합성 API 브라우저에서 선두 문서 아이콘, 제목 오른쪽 팝업→핀→분류 순서, 상단 팝업 없음/핀 유지, 활성·종료·일반 표시, 분류색 일치, 상세 조회 0건 및 가로 넘침 없음을 검증했다.
- [모바일 최종 리스트](screenshots/popup-badge-list-375.png), [태블릿](screenshots/popup-badge-list-768.png), [데스크톱](screenshots/popup-badge-list-1280.png). 피드 스크린샷도 상단 팝업 제거 상태로 갱신했다.
- 실제 사용자 데이터 접근·커밋·서버 재시작·DB 적용은 하지 않았다. 기본 기능의 배포 통합 검증 한계는 유지된다.
