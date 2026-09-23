# 공통 검색바 상세 검색 결과

## 구현 내용

- `PageSearchArea`에 기본 한 줄 검색과 상세 검색 오버레이를 추가했다.
- 상세 검색은 콘텐츠를 밀지 않고 검색 영역 아래에 겹쳐 표시한다.
- F1 컬럼에 폼모달 전용 `form.span`과 독립된 검색 전용 `search.span` 타입을 추가했다.
- `text`, `number`, `decimal`, `currency`, `select`, `checkbox`, `date` 필드를 동적으로 렌더링한다.
- `date` 필드는 `from`/`to` 범위 값으로 전달한다.
- 공통코드 그룹 검색에 `groupCode`, `groupNm`, `groupDc`, `keyword` API 조건을 연결했다.
- 백엔드는 tenant 조건과 기존 정렬을 유지한 채 검색 조건을 적용한다.
- 공통코드 페이지의 입력 중 검색값과 마지막 성공 조회 상태를 분리했다.
- 조회 성공 시에만 검색어·상세 검색값·적용 필터를 `sessionStorage`에 저장하고, 재진입 시 적용 필터로 최초 조회한다.
- 상세 검색 초기화는 화면 입력값만 비우며 기존 성공 조회 상태는 변경하지 않는다.

## 검증 증거

### Frontend

- `npm run test -- tests/page-search-area-detail.test.tsx tests/page-search-fields.test.ts tests/common-code-management.service.test.ts`
  - 3개 파일, 6개 테스트 통과
- `npm run build`
  - TypeScript 및 Vite 빌드 성공
- `npm run test -- tests/common-code-page-session.test.ts`
  - 검색 세션 복원 및 성공 조회 상태 분리 테스트 2개 통과

### Backend

- `mvn "-Dtest=CommonCodeApiControllerTest,CommonCodeBatchServiceImplTest,CommonCodeMapperJdbcTypeTest" test`
  - 3개 클래스, 6개 테스트 통과
- `git diff --check`
  - 공백 오류 없음

### Browser

- 화면: `http://127.0.0.1:4173/co/master/common-code`
- UI 클릭으로 기준정보 → 공통코드 관리 진입
- 상세 검색 오버레이에서 그룹코드 `LEVEL` 입력
- 실제 요청:
  - `GET /api/v1/co/master/common-code/groups?groupCode=LEVEL`
  - `GET /api/v1/co/master/common-code/groups/24/items`
- 응답: HTTP 200, 그룹 1건 및 상세 항목 3건 표시
- 검색 실행 후 상세 오버레이 닫힘 확인
- 입력 state updater 경고 수정 후 pageerror 없음

스크린샷:

- [375px 기본 화면](screenshots/common-code-search-375.png)
- [375px 상세 검색](screenshots/common-code-search-detail-375.png)
- [768px 화면](screenshots/common-code-search-768.png)
- [1280px 화면](screenshots/common-code-search-1280.png)

## 제한 및 잔여 사항

- 기존 `tests/page-search-area.test.tsx`는 일반/단일 worker 실행 모두 90~120초 동안 0/1 파일에서 멈췄다. 이번 변경 관련 신규·서비스 테스트와 빌드는 통과했으며, 기존 테스트 fixture/러너 문제로 별도 기록한다.
- 통합 브라우저 도구는 `setViewportSize` 호출 후 최종 `innerWidth=1043`을 보고했다. 요청된 375/768/1280 파일은 생성했지만, 이 환경에서 viewport 변경이 완전히 적용됐다는 증거에는 제한이 있다.
- DB 스키마 변경은 없으므로 SQL/롤백 파일은 생성하지 않았다.
