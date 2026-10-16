# 공지분류 문서구분 스타일 통일 상세 사양서

## 1. 목적

공지사항 피드의 공지분류 칩을 문서작성 화면의 문서구분 칩과 유사한 선명한 채움형으로 표시한다. 공지분류마다 코드 기반 색상 구분은 유지한다.

## 2. 현재 동작

- `NoticeFeedList`는 `noticeGubunCode`를 기준으로 계산한 색을 분류 칩의 배경과 글자에 적용한다.
- 색상은 코드에서 계산한 hue를 사용하지만, 현재 배경은 라이트/다크 모드 모두 낮은 채도의 파스텔 톤이다.
- 코드가 없거나 공백인 경우 라이트 모드의 연한 파랑과 다크 모드의 반투명 파랑을 사용한다.
- 문서구분 칩은 MUI `Chip`의 채움형 색상과 테마별 대비 글자색을 사용한다.

## 3. 요구사항

1. `noticeGubunCode`의 `trim()` 결과를 색상 식별자로 사용한다.
2. 기존 unsigned 32-bit rolling hash 및 `hash % 360` hue 계산을 유지한다.
3. 배경을 선명한 채움색으로 바꾼다.
   - 라이트 모드: `hsl(hue, 75%, 42%)`
   - 다크 모드: `hsl(hue, 65%, 55%)`
   - MUI 대비 계산기의 호환성을 위해 쉼표 구분 HSL 표기법을 사용한다.
4. 칩의 글자색은 현재 MUI 테마의 `palette.getContrastText(backgroundColor)`를 사용한다. 후속 승인 예외: `item.state`가 `필독`이면 라이트/다크 모두 `#ffffff`로 고정한다. 중요공지 여부와는 독립적이다.
5. 코드가 없거나 공백인 경우 테마별 기본 primary 배경을 사용한다.
   - 라이트 모드: `#1d4ed8`
   - 다크 모드: `#60a5fa`
6. 미등록·테넌트별 코드도 동일한 결정 규칙으로 생성하며, 별도 코드 목록을 만들지 않는다.
7. 기존 `item.state` 라벨, 분류 필터, 중요공지/상단고정 상태는 바꾸지 않는다.
8. 후속 승인: 피드형 및 동일 `NoticeFeedList`를 사용하는 상세 패널에서 분류 칩 높이는 `28px`, 모서리는 `8px`, 굵기는 기존 `700`을 사용한다. 배치, API·공통코드·DB 계약은 바꾸지 않는다.

## 4. 구현 범위

| 파일 | 변경 내용 |
|---|---|
| `frontend/src/pages/groupware/community/notice/data/noticeCategoryPresentation.ts` | 코드 기반 배경색 및 테마별 primary fallback 반환 |
| `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx` | 테마 대비 글자색을 사용해 채움색 표시 |
| `frontend/tests/notice-category-presentation.test.ts` | 채움색, 결정성, 서로 다른 코드, 라이트/다크 fallback 검증 |
| `frontend/tests/notice-page.test.tsx` | 실제 Chip 배경과 대비 글자색, 라벨 및 중요도 독립성 검증 |
| `docs/result/20261015/notice-category-document-kind-style/` | 검증 결과 및 가능한 경우 브라우저 캡처 기록 |

## 5. 검증 기준

- 동일 코드의 배경색이 라이트/다크 각각에서 반복 호출 시 동일하다.
- 공백을 trim한 동일 코드가 같은 색을 받고, 대표적인 서로 다른 코드는 서로 다른 배경색을 받는다.
- 알 수 없는 비어 있지 않은 코드는 결정적인 채움색을 받는다.
- 코드 누락 및 공백은 테마별 primary 색을 fallback으로 사용한다.
- 라이트/다크 렌더링에서 `필독`은 흰색, 다른 분류는 테마 contrast helper 결과와 일치한다. 모든 분류 칩의 높이 28px 및 모서리 8px를 확인한다.
- 기존 분류 라벨과 중요공지/상단고정 UI 동작이 유지된다.
- 관련 프론트엔드 테스트, 빌드, Problems 검사, `git diff --check`를 확인한다.
- 브라우저에서 공지 피드 API가 정상 제공될 때 칩의 실제 렌더링을 확인한다. API 또는 인증 오류로 확인할 수 없으면 해당 사실과 대체 검증 근거를 결과 문서에 남긴다.

## 6. 비범위

- 공지사항 API, 공통코드, 데이터 payload, DB 및 백엔드
- 공지분류 이름/목록/필터, 중요도 및 상단고정 동작
- 문서구분 색상/크기 변경
- 공지 피드의 분류 칩 배치 및 반응형 레이아웃
