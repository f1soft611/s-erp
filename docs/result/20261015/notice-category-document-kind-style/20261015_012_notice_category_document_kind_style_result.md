# 공지분류 문서구분 스타일 통일 결과

## 후속 반영: 피드형 크기·모양 및 필독 흰색 (2026-10-15)

- 사용자 승인에 따라 `NoticeFeedList` 분류 칩 높이를 28px, 모서리를 8px로 맞췄다. 공지 피드와 동일 컴포넌트를 쓰는 상세 패널에 함께 적용된다.
- `item.state === '필독'`일 때만 라이트/다크 글자색을 `#ffffff`로 고정한다. 다른 분류는 기존 테마 대비 계산을 유지하며, 분류별 배경 및 중요공지/상단고정 여부는 바꾸지 않는다.
- 수정 전 라이트/다크 렌더링 회귀 테스트 2건이 높이 24px와 모서리 불일치로 실패함을 확인했다.
- 수정 후 category 집중 테스트 10건 통과, 변경 컴포넌트 및 테스트 Problems 오류 없음, 프론트엔드 빌드 및 `git diff --check` 통과. 기존 큰 번들 경고는 유지된다.
- 실제 공지 피드의 computed style에서 `필독` 칩의 `height: 28px`, `border-radius: 8px`, `color: rgb(255, 255, 255)`를 확인했다.
- 스크린샷 시도 중 공유 브라우저가 문서작성 화면으로 이동하여 대상 요소를 찾지 못했다. 새 스크린샷은 확보하지 못했으며 기존 화면 조작과 충돌하지 않도록 추가 탐색은 중단했다.

## 적용 내용

- 공지분류 코드의 기존 trim/hash/hue 계산을 유지하면서 배경을 선명한 채움색으로 변경했다.
- 라이트 모드는 `hsl(hue, 75%, 42%)`, 다크 모드는 `hsl(hue, 65%, 55%)`를 사용한다.
- 글자색은 실제 MUI 테마의 `palette.getContrastText`로 계산한다. MUI의 HSL 파서 호환성을 위해 쉼표 구분 표기법을 사용했다.
- 코드 누락 fallback도 라이트 `#1d4ed8`, 다크 `#60a5fa` 채움색으로 맞췄다.
- 분류명, 필터, 중요공지/상단고정 동작, 칩 크기와 모양, 문서구분 화면, API와 DB는 변경하지 않았다.

## 검증

| 항목 | 결과 |
|---|---|
| 구현 전 회귀 테스트 | 9건 실패: 파스텔 배경/fallback 및 테마 대비 글자색 불일치 확인 |
| 구현 후 category 집중 테스트 | 10 통과, 29 제외 |
| 관련 두 파일 전체 실행 최종 결과 | 38 통과, 기존 스켈레톤 테스트 1 실패 |
| 기존 실패 | `keeps the initial skeleton loading state without showing a preloaded notice list`: `notice-feed-skeleton`을 찾지 못함. 이전 분류 색상 작업 결과에도 기록된 기존 실패로 수정하지 않음 |
| 병렬 빌드 중 전체 테스트 실행 | 37 통과, 기존 스켈레톤 실패와 category 테스트의 5000ms timeout 발생. 빌드 없이 재실행하면 category 테스트 통과 |
| `npm run build` | 통과. 기존 1000kB 이상 번들 경고 유지 |
| 변경 코드 및 테스트 Problems | 오류 없음 |
| `git diff --check` | 통과 |
| VS Code 테스트 도구 | 테스트 탐색 불가로 기존 Vitest CLI로 검증 |

테스트 실행 중 기존 댓글 테스트의 React `act` 경고가 출력되었다. 무관한 댓글 구현 및 스켈레톤 테스트는 변경하지 않았다.

## 브라우저 검증

- 기존 4173 S-ERP 서버를 재사용했으며 서버 프로세스를 생성하거나 종료하지 않았다.
- 실제 공지 피드에서 파랑/보라/초록 계열의 분류 칩이 서로 다른 채움색과 흰색 또는 검정 계열 대비 글자색으로 표시됨을 확인했다.
- 라이트 모드의 실제 CSS viewport 375px, 768px, 1280px에서 페이지 전체 가로 넘침이 없음을 확인했다.
- 다크 모드에서도 분류별 채움 배경과 대비 글자색을 DOM computed style로 확인했다. 다크 모드 검사 중 브라우저 배율이 바뀌어 실제 CSS viewport는 250px, 512px, 853px였으며 이 너비에서도 가로 넘침은 없었다. 다크 모드의 정확한 375/768/1280px 재검증은 미완료다.
- 분류 칩만 자른 캡처는 단색 빈 이미지로 저장되어 확인 후 삭제했다. 업무 본문/사용자 정보를 담은 전체 화면 캡처도 보관하지 않았다. 유효한 스크린샷 산출물은 없으며 별도 후속 확인이 필요하다.
- 검증 중 다른 자료실 화면의 아이콘 import 해석 오류로 Vite 오류 오버레이도 발생했다. 해당 파일은 이 작업에서 수정하지 않았다.
- 테마 메뉴는 포인터 이벤트가 다른 요소에 가려 키보드로 조작했다. 해당 공통 레이아웃은 변경 범위가 아니므로 수정하지 않았다.

## 수정 파일

- [프레젠테이션](../../../../frontend/src/pages/groupware/community/notice/data/noticeCategoryPresentation.ts)
- [피드 칩](../../../../frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx)
- [프레젠테이션 테스트](../../../../frontend/tests/notice-category-presentation.test.ts)
- [렌더링 테스트](../../../../frontend/tests/notice-page.test.tsx)

관련 문서는 [작업지시서](../../../directions/20261015/20261015_012_공지분류_문서구분_스타일_통일_작업지시서.md), [계획서](../../../plan/20261015/20261015_012_notice_category_document_kind_style_plan.md), [사양서](../../../spec/20261015/20261015_012_notice_category_document_kind_style_spec.md)를 따른다. 백엔드/DB 변경이 없어 DB 확인 및 마이그레이션은 해당하지 않는다.
