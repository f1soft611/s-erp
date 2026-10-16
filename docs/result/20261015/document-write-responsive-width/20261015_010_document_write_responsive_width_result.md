# 문서작성 상세 패널 반응형 너비 수정 결과

## 변경 내용

- `DocumentWritePage`의 페이지 루트 `Box`에 `minWidth: 0`을 추가해 flex item이 대시보드 콘텐츠 영역 너비에 맞게 줄어들 수 있도록 했습니다.
- 문서작성 페이지 통합 테스트에서 루트의 `min-width: 0` 스타일을 확인하는 회귀 assertion을 추가했습니다.
- 공통 `PageAreaOverlay`, 대시보드 셸, 사이드바, 공지 페이지 및 결재 처리 동작은 변경하지 않았습니다.

## 원인 및 범위

저장된 375px 사전 캡처에서 문서 상세 패널의 오른쪽이 화면 밖으로 잘리는 현상을 확인했습니다. 문서 페이지 루트가 `flex: 1`인 containing block이면서 `minWidth: 0`을 선언하지 않아 내부 최소 너비를 전달할 가능성을 확인했습니다. 새 회귀 assertion은 수정 전 해당 스타일이 빠져 있음을 실패로 검증했고, 수정 후 동일 assertion이 통과했습니다.

현재 브라우저에는 인증된 문서작성 화면이 없어 수정 후 실제 DOM rect를 재측정하지 못했습니다. 따라서 CSS 계약과 자동 테스트는 검증했지만, 모바일 브라우저에서 시각 문제가 완전히 해소됐다는 것은 이 결과에서 주장하지 않습니다.

## 검증 결과

| 항목 | 결과 |
|---|---|
| 수정 전 집중 회귀 테스트 | 예상대로 실패: `minWidth: 0px` 누락 |
| 수정 후 문서작성 집중 테스트 | 통과: 1 passed, 나머지 82개는 필터로 skip |
| `tests/post-detail-panel.test.tsx` | 통과: 3 tests |
| `npm run build` | 통과. 기존 큰 번들 경고 출력: `index` JS 1,052.92 kB |
| `npm run test` 전체 실행 | 실패: 84개 파일 중 27개 실패·57개 통과, 958개 테스트 중 194개 실패·764개 통과. `document-write-page.test.tsx`는 20개 실패를 포함하지만 이 변경의 집중 회귀 테스트는 통과했으며, 전체 실패의 원인은 이 변경으로 단정할 수 없음 |
| Problems 검사 | `DocumentWritePage.tsx`, `document-write-page.test.tsx` 오류 없음 |
| `git diff --check` | 통과 |
| 실제 브라우저 375/768/1280px | 미검증. 4173 서버는 S-ERP Vite였으나 초기 `/`는 `/login`으로 열렸고, 직접 시도한 `/groupware/write` 경로는 404를 반환해 인증된 페이지에 도달하지 못함 |

전체 테스트 실행에서는 앱 라우터, 공통코드 관리, 문서작성 등 여러 영역에서 실패가 발생했습니다. 전체 출력은 임시 로그에 있으며, 이번 수정 전에 동일 전체 테스트를 실행하지 않아 기존 실패인지 여부는 확인하지 못했습니다. 따라서 이 실패들을 무관한 기존 문제라고 단정하지 않습니다.

## 캡처

수정 후 인증된 화면 캡처는 생성하지 않았습니다. 기존 [375px 결함 재현 캡처](../document-approval-toolbar-reordering/screenshots/doc-detail-375.png)는 수정 전 증거이며 수정 후 결과로 간주하지 않습니다.

## 관련 문서

- [작업지시서](../../../directions/20261015/20261015_010_문서작성_상세패널_모바일_너비_수정_작업지시서.md)
- [구현 계획서](../../../plan/20261015/20261015_010_document_write_responsive_width_plan.md)
- [상세사양서](../../../spec/20261015/20261015_010_document_write_responsive_width_spec.md)
- [승인 설계](../../../superpowers/specs/2026-10-15-document-write-responsive-width-design.md)
