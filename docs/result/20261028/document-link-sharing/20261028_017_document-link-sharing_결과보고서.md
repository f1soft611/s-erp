# 문서 링크 공유 결과

## 구현

- 피드·문서 상세의 더보기에 `문서 공유하기`를 추가했다. 문서 수정 권한과 독립적으로 노출하며 복사 성공/실패를 알린다.
- 현재 origin의 `/groupware/doc/write?documentId=<id>` 링크를 사용한다. 로그인 상태의 직접 진입은 해당 상세를 열며, 닫으면 URL의 문서 ID를 제거한다.
- 본문과 댓글/답글의 작성·수정·조회에서 내부 링크를 카드로 표시한다. 제목, 종류, 기안자와 요약을 표시하며 같은 콘텐츠 내 중복은 제거한다.
- 카드는 기존 권한 필터가 적용되는 문서 목록 API를 ID로 조회한다. 외부 OG 수집이나 공개 메타데이터 API를 만들지 않았고 메타데이터를 본문/댓글에 저장하지 않는다.
- 접근할 수 없거나 삭제된 문서는 내용 없이 안내한다. 네트워크 오류는 재시도할 수 있다.
- 카드 클릭 시 우측 링크 상세 패널을 열고 기존 상세 API가 권한을 다시 검사한다. 작성창은 유지하며 상세를 닫아도 입력 내용이 남는다.
- 문서현황의 재사용 상세/작성창에도 패널 연결을 적용했다. 기존 작성창이 열려 있으면 링크 상세의 수정/삭제 메뉴를 숨겨 작성 내용을 보호한다.
- 리뷰에서 발견한 양식의 silent 교체 후 오래된 카드가 남는 문제를 transaction 동기화로 수정했다.

## 검증

| 항목 | 결과 |
|---|---|
| 공유 링크·미리보기·편집기·피드 관련 Vitest | 5개 파일, 83개 통과 |
| 기존 문서작성의 진행 중 문서 삭제 제한·임시저장 삭제 메뉴 | 2개 선택 테스트 통과 |
| TypeScript + Vite | `npm run build` 통과 |
| 변경 범위 oxlint | 오류 0, 기존 코드 경고 유지 |
| 실제 Chromium 375/768/1280px | 3개 크기 모두 통과 |
| Diff whitespace | `git diff --check` 오류 없음 |

최종 집중 검증 명령은 `frontend`에서 실행했다.

```powershell
node node_modules\vitest\vitest.mjs run tests/document-link-sharing.test.tsx tests/document-link-navigation.test.tsx tests/document-link-content.test.tsx tests/rich-text-editor.test.tsx tests/feed-components.test.tsx --maxWorkers=1 --testTimeout=15000
npm run build
node tests\document-link-sharing.browser.mjs
```

브라우저 검증은 기존 S-ERP 4173 서버를 확인해 재사용했으며 해당 서버를 종료하지 않았다. 가상 API 응답과 테스트용 사용자만 사용했다. 피드·상세·링크 상세의 복사, 본문 붙여넣기, 상세 열기, 미리보기 후 권한 회수에 따른 상세 거부, 작성 상태 보존, 가로 넘침 없음과 브라우저 예외 없음을 확인했다. 실제 DB 사용자별 인가 시나리오를 실행한 것은 아니며 서버의 기존 인가 로직을 변경하지 않았다.

### 기존/병행 작업 검증 제약

- `npm run lint` 전체 실행은 변경하지 않은 `tests/common-code-management-page.test.tsx:53`의 조건부 `useImperativeHandle` 오류로 실패했다.
- 최초 문서작성/현황을 포함한 광역 테스트에는 다수 실패가 있었다. 수정하지 않은 HEAD의 별도 로컬 스냅샷에서도 `renders at the groupware write route instead of the coming-soon page`가 동일하게 목록 region을 찾지 못하며 실패하는 것을 재현했다.
- 작업 중 문서번호 관련 백엔드·Mapper·프론트 계약 및 현황 테스트가 별도로 수정되고 있었다. 해당 변경을 되돌리거나 이번 공유 기능 변경으로 기록하지 않았다. 전체 회귀 통과로 보고하지 않는다.
- 공통 에디터 색상 테스트의 기본 5초 시간 초과는 단일 worker 및 15초 제한으로 재검증해 통과했다.

## DB 확인과 변경 범위

- 읽기 전용 MCP에서 `list_tables` → `describe_table(tb_electronic_approval_main)`을 직접 호출해 문서 식별자, tenant, 제목, 본문, 삭제 상태 컬럼을 확인했다. 데이터 행은 조회하거나 기록하지 않았다.
- 기존 `DocumentApproval_SQL_postgresql.xml`의 `documentReadAccess`, 문서 ID 필터와 기존 상세 접근 검사 서비스를 근거로 기존 API만 재사용했다. 미리보기 때문에 상세 조회수를 올리지 않는다.
- 이번 작업의 백엔드/API/DB 스키마 변경은 없으므로 신규 SQL/롤백 스크립트는 필요하지 않다.
- 기존 로그인 이동 정책은 유지한다. 비로그인 상태에서 로그인 후 원래 공유 URL로 자동 복귀하는 인증 기능은 추가하지 않았다.

## 스크린샷

| 너비 | 작성 중 링크 미리보기 | 우측 상세 |
|---|---|---|
| 375px | [작성창](screenshots/composer-375.png) | [상세](screenshots/detail-375.png) |
| 768px | [작성창](screenshots/composer-768.png) | [상세](screenshots/detail-768.png) |
| 1280px | [작성창](screenshots/composer-1280.png) | [상세](screenshots/detail-1280.png) |

## 완료 체크

- [x] 작업지시서 → 계획서 → 상세 사양서 → 구현 순서 유지
- [x] 실패 테스트 확인 후 구현 및 리뷰 지적의 회귀 테스트 확인
- [x] 클립보드·잘못된 URL·외부 URL·중복·권한 거부·재시도·상세 연결 확인
- [x] 본문·댓글·수정·답글 및 silent 양식 교체 확인
- [x] 반응형 브라우저 검증과 스크린샷 보관
- [x] 기존 변경 보존 및 백엔드/DB 변경 없음 확인
