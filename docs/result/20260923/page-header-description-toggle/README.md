# PageHeader 설명 접힘 상태 저장

## 변경 내용

- `PageHeader` 브레드크럼 맨 앞에 브레드크럼 아이콘을 추가했다.
- 브레드크럼 마지막 경로 옆에 메뉴 설명을 접고 펼칠 수 있는 토글 버튼을 배치했다.
- 설명을 접으면 설명 행 자체를 제거해 헤더 공간을 회수한다.
- 접힘 상태를 `localStorage`의 `page-header-description-collapsed` 키에 저장한다.
- 새 페이지 헤더가 마운트될 때 저장된 접힘 상태를 복원한다.
- 토글 버튼에 한국어 `aria-label`과 `aria-expanded`를 적용했다.

## 검증

- `npm run test -- tests/page-header.test.tsx tests/page-search-area.test.tsx` 통과
- `npx oxlint src/shared/components/PageHeader.tsx tests/page-header.test.tsx tests/page-search-area.test.tsx` 통과
- `npm run build`는 기존 `CommunityNoticePage.tsx:1593`의 `DrawerProps`에 없는 `PaperProps` 타입 오류로 중단됨

## 회귀 기준

- 설명 접기 후 설명 문구가 숨겨진다.
- 접힘 상태가 브라우저 저장소에 `true`로 기록된다.
- 컴포넌트를 다시 마운트해도 저장된 접힘 상태가 유지된다.
- 설명 펼치기 토글과 기존 검색 영역 접힘 테스트가 통과한다.
