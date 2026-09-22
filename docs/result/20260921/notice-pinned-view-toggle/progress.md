# 공지사항 상단 고정 및 공통 보기 전환 진행 원장

- 작업지시서: [20260921_006 공지사항 상단 고정 및 보기 전환](../../../directions/20260921/20260921_006_공지사항_상단고정_보기전환_작업지시서.md)
- 계획서: [계획서](../../../plan/20260921/20260921_006_공지사항_상단고정_보기전환_계획서.md)
- 상세 사양서: [상세 사양서](../../../spec/20260921/20260921_006_공지사항_상단고정_보기전환_상세사양서.md)
- 상세 실행 계획: [상세 실행 계획](../../../plan/20260921/20260921_006_공지사항_상단고정_보기전환_상세실행계획.md)

## 상태

- 현재 브랜치 진행: 승인됨
- 실행 방식: Inline Execution
- 현재 단계: 10단계 완료 정리 대기
- 작업지시서 승인: 완료
- 계획서·사양서 승인: 완료
- 구현 승인: 완료
- 기준선: `npm run test` 결과 22개 파일 통과, 19개 파일 실패 / 391개 테스트 통과, 151개 테스트 실패. 기존 실패는 별도 잔여 위험으로 추적.

## 태스크

- [x] Step 1 공통 표시 모델과 모드 계약
- [x] Step 2 공통 모드 컨트롤과 상단 고정 영역
- [x] Step 3 공통 피드·리스트 목록 및 스켈레톤
- [x] Step 4 공지사항 어댑터와 페이지 연결
- [x] Step 5 모드별 재조회와 스켈레톤 연결
- [x] Step 6 회귀 테스트 보강
- [x] Step 7 타입·빌드·브라우저 검증

## 검증 기록

- 기준선 실행: `cd frontend; npm run test`
- 기준선 결과: 기존 실패 다수 확인, 신규 변경 성공 판정과 분리 필요
- 공통 보기 테스트: `npm run test -- tests/common-view-mode.test.tsx` 통과 (1개 파일, 4개 테스트)
- 공통 보기 타입 진단: 새 컴포넌트 7개 오류 없음
- 공지 어댑터 테스트: `npm run test -- tests/notice-view-adapter.test.ts` 통과 (1개 파일, 1개 테스트)
- 공지 모드 전환 테스트: `npm run test -- tests/notice-page-local-updates.test.tsx`에서 신규 모드 전환 테스트 통과. 기존 테스트 20건은 기준선 실패로 분리.
- 공지 페이지·어댑터 진단: 오류 없음
- 공통·공지 테스트 진단: 오류 없음
- 공통 보기 테스트 재검증: `npm run test -- tests/common-view-mode.test.tsx` 통과 (1개 파일, 4개 테스트)
- 모드 전환·리스트 스켈레톤 신규 테스트: 통과. 동일 테스트 파일의 기존 실패는 별도 잔여 위험으로 분리.
- 공통 피드 연결 리뷰: `NoticeFeedList`가 공통 제네릭 `FeedView`를 사용하도록 보완.
- 공통 피드·공지 페이지 검증: 공통 테스트 포함 20개 통과, 기존 페이지 테스트 5개 실패. 기존 실패는 기준선 잔여 위험으로 분리.
- 프론트 빌드: `npm run build` 성공 (TypeScript 검사 및 Vite 번들 완료).
- 브라우저 검증: 공지사항 화면 진입, 상단 고정 영역, 피드형 기본 상태, 리스트형 전환과 행 표시 확인.
- 스크린샷: `screenshots/feed-1280.png`, `screenshots/list-1280.png`, `screenshots/list-768.png`, `screenshots/list-375.png`
- 브라우저 제한: 통합 브라우저의 CSS viewport가 1030px로 고정되어 `setViewportSize`의 실제 CSS viewport 반영 여부는 확인할 수 없었음. 소스에는 모바일 1열 반응형 규칙을 적용하고, 375px 캡처는 결과물로 보관.
- 최종 코드 리뷰: 공통 FeedView의 도메인 id 가정 문제를 발견해 제거하고 재빌드.
- 최종 공통 테스트: `npm run test -- tests/common-view-mode.test.tsx tests/notice-view-adapter.test.ts` 통과 (2개 파일, 5개 테스트)
- 최종 빌드: `npm run build` 성공.
- 결과 문서: [README](./README.md)
- 레이아웃 확장: 공통 `ContentSplitLayout`, 우측 `SummaryPanelSkeleton`, 문서형 `ListView` 및 리스트 스켈레톤 구현.
- 핵심 테스트: 공통 셸·문서형 리스트 6개, 공지 모드 전환·리스트 스켈레톤 2개 통과.
- 레이아웃 빌드: `npm run build` 성공.
- 브라우저 레이아웃: 좌측 상단 도구·상단 고정 영역·문서형 리스트·우측 요약/최근 이슈 확인.
- 브라우저 sticky: 우측 슬롯 computed style `position: sticky`, `top: 16px` 확인.
- 브라우저 리스트 행: 리스트형 공지 9개 행 렌더링 확인.
- 최신 캡처: `screenshots/list-document-layout.png`
- 최종 타입 진단: 변경 주요 파일 오류 없음.
- 최종 핵심 테스트: 8개 통과, 0개 실패, 29개 스킵.
- 최종 공백 검사: `git diff --check` 통과.
