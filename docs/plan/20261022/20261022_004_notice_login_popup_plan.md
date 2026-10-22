# 로그인 공지 팝업 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 공지별 종료일과 사용자별 하루 숨김을 지원하는 로그인 팝업 및 승인된 작성 화면 배치 구현.

**Architecture:** 기존 공지 저장 모델과 매퍼에 설정을 추가한다. 팝업 전용 서비스/컨트롤러는 현재 로그인에서 받을 대기열과 오늘 숨김을 관리하고, 상세는 기존 최초 조회수 처리에 위임한다. 인증 라우터 바깥의 단일 호스트는 로그인 세션 ID와 표시 진행 상태만 sessionStorage에 보관하며 하루 숨김은 서버가 판정한다.

**Tech Stack:** React, TypeScript, MUI CommonDialog, Spring Boot, MyBatis, PostgreSQL, Vitest, JUnit.

## 1. 계약 및 스키마

- [x] `NoticeBoardPostVO`, `NoticeBoardPostSaveRequestVO`에 `loginPopupYn`, `popupEndDate` 추가. 날짜는 JSON 문자열 `YYYY-MM-DD`.
- [x] `NoticeBoardServiceImpl`에서 저장 전 Y/N와 실제 달력 날짜 검사. Y인 경우 종료일 필수, N이면 날짜 null.
- [x] `NoticeBoard_SQL_postgresql.xml`의 목록/상세/등록/수정 모두 설정 매핑.
- [x] `backend/DATABASE/20261022`와 `docs/database/20261022`에 `20261022_004` SQL/롤백/변경 이력, 누적 스키마 갱신.
- [x] 기본 MCP의 list_tables → describe_table(게시글/조회이력/로그인) → 제약 메타데이터 확인. 실제 DDL은 수행하지 않음.

## 2. 서버 팝업 흐름

- [x] `NoticeLoginPopupServiceTest`에서 목록 무집계, 상세 유효성, 날짜 경계, 숨김 upsert, 비활성 제외, 인증 계정 실패 테스트를 먼저 작성/실행.
- [x] `NoticeLoginPopupService`와 `NoticeLoginPopupApiController` 작성. 기존 `NoticeBoardDAO`에 팝업 목록/상세 검증/숨김 메서드 추가.
- [x] SQL은 tenant/NOTICE/미삭제/Y/종료일/개인 숨김을 강제. 일자는 `LocalDate.now(Clock.system(ZoneId.of("Asia/Seoul")))`.
- [x] 목록은 메타데이터만 반환. 현재 공지 상세만 기존 `getPost(tenantId, postId, loginCode)`를 호출.
- [x] 같은 날짜 숨김은 `(tenant_id, post_id, login_id)` upsert로 멱등 처리.
- [x] 기존 notice 서비스·매퍼 테스트와 새 테스트를 한 Maven 실행으로 확인.

## 3. 작성 UI와 타입

- [x] composer 테스트에 필드 순서/보더/종료일 필수/편집 초기값/비활성 날짜 제거를 먼저 검증.
- [x] `community.types.ts`, `noticePostAdapter.ts`, `CommunityNoticePage.tsx`, `useNoticeMutations.ts` 전체 저장/편집 경로에 설정 연결.
- [x] `NoticeComposerDialog.tsx`: outlined 구분 → 체크박스/날짜 2열 → outlined 제목 → 기존 에디터. 제목 굵기 유지. 저장 진행 중 새 필드 수정 금지.

## 4. 로그인 호스트

- [x] `noticeLoginPopupService.ts`로 팝업 API, `NoticeLoginPopupHost.tsx`로 한 건씩 상세 조회/확인/숨김/오류/다음 진행.
- [x] 기존 공지 피드 본문 컴포넌트의 HTML 정제·인증 이미지 표시를 재사용하고 댓글·수정 액션은 표시하지 않음.
- [x] `authService.ts`의 실제 로그인 성공에만 popup 세션 ID 부여(토큰 사용 금지), logout에서 진행 상태 제거.
- [x] `App.tsx`의 라우터 아래에 단일 호스트. 사용자·tenant·세션 키를 구분하여 새로고침/메뉴 이동 중 재노출 방지.
- [x] 큐 완료까지 현재 인덱스만 저장. 숨김 요청 실패 시 다음으로 넘기지 않고 오류/재시도. 만료/삭제된 항목은 명시 후 건너뛰기.
- [x] Vitest에 로그인/세션복원/다중공지/개별숨김/재시도/상세 하나씩 조회 회귀 작성.

## 5. 검증 및 결과

- [x] 작성/팝업/서비스/어댑터/상호작용/저장 집중 테스트 41개 통과. 기존 화면 테스트 실패는 HEAD에서도 비교 확인.
- [x] `cd frontend; npm run build`
- [x] 팝업 컨트롤러/서비스/저장 검증 및 기존 notice 서비스/매퍼 Maven 테스트 39개 통과.
- [x] 4173 실제 브라우저에서 375/768/1280 화면/순차 표시/체크 저장/실패 검증. DB 미반영 환경에서는 명시적 브라우저 mock 계약으로 분리 검증.
- [x] `docs/result/20261022/notice-login-popup`에 결과·스크린샷·MCP 증거·실제 DB 미적용과 배포 순서 기록.
- [x] 다른 작업의 변경을 건드리거나 임의 커밋하지 않는다.

## 후속 UI 변경: 진행 표시 위치

- [x] 기존 CommonDialog의 description으로 진행 표시를 전달하여 '로그인 공지' 타이틀 바로 아래에 배치한다. 본문의 중복 표시는 제거한다.
- [x] 같은 헤더 설명 영역에 작성자·작성일시(시각 포함)를 표시하고 본문의 작성 정보를 제거한다.
- [x] 단일/다중 공지의 헤더 위치 및 진행 갱신을 회귀 테스트하고 375/768/1280px 브라우저 스크린샷을 갱신한다.

## 후속 헤더 디자인 개선

- [x] `CommonDialog.tsx`에 선택적 `titleAside` 및 ReactNode description을 지원한다. 기본 사용처의 DOM/색상/접근성은 보존한다.
- [x] `NoticeLoginPopupHost.tsx`에서 진행 배지는 titleAside에, 작성자/작성일시는 아이콘과 라벨을 가진 description에 표시한다. 모바일은 작성 정보를 세로 배치하며 날짜와 시간을 묶어 줄바꿈한다.
- [x] `common-dialog.test.tsx`, `notice-login-popup.test.tsx`에 배지/작성 정보 분리와 기본 모달 회귀를 검증한다. 실패 확인 후 구현한다.
- [x] 집중 테스트·빌드 및 375/768/1280px 합성 API 브라우저 검증 후 결과/스크린샷을 갱신한다. 기존 서버와 다른 기능은 변경하지 않는다.

## 후속 목록 아이콘 및 분류 배지

- [x] `components/NoticeLoginPopupBadge.tsx`: 기존 loginPopupYn/popupEndDate를 받아 활성/종료 아이콘·종료일 툴팁 표시. 한국 날짜 기준 종료일 당일까지 활성, 열린 화면도 자정/복귀 시 갱신. 후속 사용자 요청으로 텍스트 배지를 아이콘으로 변경.
- [x] `NoticeFeedList.tsx`: 핀 바로 옆에 동일 아이콘 표시. 기존 제목/구분/핀 동작 유지. 분류 배지는 공지 전용 `NoticeCategoryBadge`로 재사용.
- [x] `data/noticeViewAdapter.ts`: 공지 전용 뷰 타입에 팝업/구분 설정을 보존. `ListView`/`PinnedItemsPanel`의 선택적 icon renderer와 `ListView`의 category renderer를 추가하여 공지에서만 핀+팝업 아이콘과 통일된 분류색을 연결한다. 기본 렌더링은 보존한다.
- [x] 배지 미표시/활성/종료일 당일/익일/한국 자정/날짜 툴팁, 어댑터 및 피드 회귀 테스트를 실패 확인 후 구현한다.
- [x] 집중 테스트·빌드·lint와 375/768/1280px 피드·리스트 브라우저 검증 후 결과·스크린샷을 갱신한다. API/DB 변경 없음.

## 후속 리스트 아이콘 위치

- [x] `CommunityNoticePage.tsx`: 리스트 분류 렌더러에 `Box`로 팝업 → 핀 → 기존 compact 분류 배지를 묶는다. 선두는 문서작성처럼 기본 문서 아이콘을 재사용한다. 상단 고정 패널의 팝업 렌더러와 불필요해진 helper/공통 슬롯을 제거하여 기존 핀만 유지한다.
- [x] `ListView.tsx`: 중간 요청에서 추가했던 null 렌더러의 빈 열 제거 처리는 최종 요구에 불필요하므로 제거하고 기존 기본 아이콘/열을 유지한다.
- [x] `common-view-mode.test.tsx`: 기본 문서 아이콘과 24px 선두 열 및 행 선택을 검증한다. 브라우저에서 공지 리스트의 선두 문서/우측 배지 순서를 검증한다.
- [x] 집중 테스트/빌드 및 375/768/1280px에서 분류 인접 순서·넘침·색상·상세 요청 없음 검증 후 결과와 스크린샷 갱신. 커밋/서버 재시작 없음.

## 검증 한계

코드와 합성 API 브라우저 검증까지 수행했다. 실제 PostgreSQL 마이그레이션 적용 및 재배포 후의 통합 검증은 남아 있다. 기존 HEAD에서도 발생하는 로그인 2개, 공지 화면 1개, 공지 로컬 갱신 16개 실패는 이 기능의 집중 테스트 성공과 구분하며 상세 내용은 결과 문서에 기록한다.
