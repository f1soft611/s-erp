# F1-Grid 사용자 선택 컬럼 진행 원장

## 승인 문서

- 설계: [F1-Grid 사용자 선택 컬럼 설계](../../../superpowers/specs/2026-10-01-f1-grid-user-selector-design.md)
- 작업지시서: [20261001_005](../../../directions/20261001/20261001_005_F1Grid_사용자_선택_컬럼_작업지시서.md)
- 계획서: [20261001_005](../../../plan/20261001/20261001_005_F1Grid_사용자_선택_컬럼_계획서.md)
- 상세 사양서: [20261001_005](../../../spec/20261001/20261001_005_F1Grid_사용자_선택_컬럼_사양서.md)
- 작업 방식: 기존 브랜치에서 Inline Execution, 커밋 없음

## 진행 상태

- [x] 읽기 전용 DB 스키마 및 기존 F1-Grid/API 경로 확인
- [x] 승인 문서와 단계별 구현 계획 작성
- [x] RED/GREEN: 셀 단일·다중 사용자 선택, ID 타입 보존, 미변경 배열 dirty 없음
- [x] 공용 선택기를 Grid cell과 row form modal에 연결
- [x] 사용자 API에 프로필 이미지/활성 LEVEL 이름 추가
- [x] 기안양식 reviewer/approver/assignee를 user 타입으로 적용하고 기존 ID payload 보존
- [x] API/F1-Grid/기안양식 focused 테스트 및 build 검증
- [x] 브라우저 375/768/1280px 셀·모달 확인 및 스크린샷
- [x] 결과 문서/진행 원장 최종 검토

## 실행 기록

- 프론트 수정 전 `f1-grid.test.tsx`: 194 tests 중 148 passed/46 failed. 기존 mojibake 한국어 접근성 fixture 실패가 포함되어 신규 user 테스트는 이름 필터로 분리 실행했다.
- 신규 F1-Grid 셀 테스트: 3 passed (single ID, multiple ID array, unchanged multiple value remains clean).
- `f1-grid-form-modal.test.tsx`: 43 passed. 기존 `onValueChange` 테스트의 MUI out-of-range select warning은 있었으나 suite는 통과했다.
- 기안양식 page focused user normalization/column/dirty/PUT tests: 통과.
- 기안양식 전체: 17 중 16 passed. 기존 `soft-disables a deleted Grid row by saving useAt N`은 context menu의 `행 삭제` 항목 미노출로 실패했다. 이 변경 전 작업 원장에도 같은 실패가 기록되어 있다.
- Frontend `npm --prefix frontend run build`: 성공, Vite 1499 modules transformed.
- Backend focused: 18 tests passed.
- Backend `mvn test`: 150 tests, 0 failures/errors, 2 skipped; `BUILD SUCCESS`.
- DB MCP: `profile_image`, `level_id` 및 `LEVEL` 코드 그룹/항목, 부서 컬럼이 기존 스키마에 있음을 확인했다. DB 스키마 변경 및 SQL migration은 없다.
- 공유 브라우저 실제 화면: reviewer picker 검색에서 `zzz-no-match`는 `No options`, 이름 검색은 후보를 복원했다. 기존 reviewer를 다시 선택하고 Escape/취소했을 때 저장 버튼은 비활성이었고 서버 write는 실행하지 않았다.
- 공유 브라우저의 현재 사용자 응답에는 직급/부서 문자열이 없어 실데이터 화면에는 이름/프로필만 표시됐다. fixture 캡처에서는 프로필 이미지·직급·부서 표시를 검증했다.
- 좁은 Grid cell anchor 때문에 popup 옵션명이 잘리는 문제를 재현했다. 최소 폭 320px와 `preventOverflow.altAxis`를 적용한 뒤 화면 경계 내 배치를 검증했다.
- Browser fixture row form popup bounds: 375px `28..348`, 768px `65..385`, 1280px `180..500`; 375px form modal은 full-screen이다.
- Browser fixture Grid cell popup bounds: 375px `14..334`, 768px `14..334`, 1280px `434..754`; 각 viewport에서 popup 폭 320px이며 page/body overflow가 없다.
- 캡처: `screenshots/user-form-{375,768,1280}px.png`, `screenshots/user-cell-{375,768,1280}px.png`.
