# 공지분류 문서구분 스타일 통일 계획서

## 목표

공지분류별 코드 기반 색상은 그대로 두고, 공지 피드 분류 칩을 선명한 채움형으로 바꿔 문서구분 칩의 시각적 스타일에 맞춘다.

## 기준 문서

- [작업지시서](../../directions/20261015/20261015_012_공지분류_문서구분_스타일_통일_작업지시서.md)
- [상세 사양서](../../spec/20261015/20261015_012_notice_category_document_kind_style_spec.md)
- [승인 설계](../../superpowers/specs/2026-10-15-notice-category-document-kind-style-design.md)
- [상세 실행 계획](../../superpowers/plans/2026-10-15-notice-category-document-kind-style.md)

## 구현 단계

1. `notice-category-presentation.test.ts`에서 배경색 채움 값, theme-specific fallback, stable code hue 동작을 먼저 검증한다.
2. `notice-page.test.tsx`에서 light/dark theme provider 아래 category chip 색과 기존 레이블 및 중요공지 상태를 검증한다.
3. 테스트 실패를 확인한 다음 `noticeCategoryPresentation.ts`에서 파스텔 배경을 선명한 HSL 배경으로 바꾸고 기본 fallback을 테마 primary 색상으로 맞춘다.
4. `NoticeFeedList.tsx`에서 MUI 테마의 `palette.getContrastText`로 각 채움 배경에 대비되는 글자색을 설정한다.
5. 후속 승인된 피드 칩 높이 28px, 모서리 8px 및 `필독` 흰색 글자 회귀 테스트를 먼저 추가한다. 라이트/다크에서 실패 확인 후 같은 `NoticeFeedList` Chip에 적용하여 피드와 상세 패널 모두 일치시킨다.
6. 집중 테스트, 프론트엔드 빌드, Problems 및 diff 검사를 실행하고 결과 문서에 근거를 기록한다. 브라우저 API가 정상일 경우 실제 화면도 확인한다.

## 범위 및 주의사항

- 프론트엔드 공지분류 프레젠테이션, 피드 Chip, 관련 두 테스트 파일만 코드 수정 대상으로 한다.
- 코드 hash 계산, 레이블, 필터, 중요공지/상단고정 동작은 유지한다. 칩 크기/모양과 필독 글자색만 후속 승인대로 적용한다.
- API, 공통코드, 백엔드, DB 및 문서구분 화면은 수정하지 않는다.
- 기존 작업공간의 미커밋 변경을 덮어쓰거나 되돌리지 않는다.
