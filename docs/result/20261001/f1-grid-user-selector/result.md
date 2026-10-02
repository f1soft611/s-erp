# F1-Grid 사용자 선택 컬럼 결과

## 구현 요약

- `F1GridEditorType`에 `user`와 `F1GridUserOption`/`userOptions` 계약을 추가했다.
- Grid cell 편집은 내부 TextField outline/underline 없이 GridCell active outline을 사용한다. Row form modal은 기존 outlined field 스타일을 유지한다.
- 공용 검색 선택기는 사진/이름/직급/부서를 표시하고 이름·직급·부서를 검색한다. 사진이 없거나 로드되지 않을 때 Avatar가 이름 이니셜을 fallback으로 사용한다.
- 셀 편집과 row form modal은 동일한 picker를 사용한다. `form.multiple`에 따라 단일 ID 또는 ID 배열을 처리하고 선택 chip X로 개별 해제한다.
- 셀 편집 draft는 single scalar와 multi array를 지원하며 원래 옵션 ID 타입을 복원한다. 동일한 배열 값 commit은 dirty로 취급하지 않는다.
- Autocomplete option의 포탈 `mousedown`을 Grid outside-click commit 예외로 처리했다. 이전에는 document capture handler가 option click보다 먼저 편집기를 닫아 실제 마우스 선택이 셀에 반영되지 않았다.
- 기안양식의 reviewer/approver는 numeric `loginId | null`, assignee는 string `userId[]`를 그대로 유지한다. 담당자 셀 편집도 허용한다.
- 사용자 API는 기존 tenant/활성 사용자 범위를 유지하며 `profileImage`, 활성 `LEVEL`의 `levelNm`을 반환한다. DB 변경은 없다.

## 검증 결과

- Frontend: F1-Grid user cell 단일/다중/unchanged tests 3 passed.
- Frontend: `f1-grid-form-modal.test.tsx` 43 passed.
- Frontend: `draft-form-management.test.tsx` 19 passed, 기존 soft-delete context menu 테스트 1 failed (기존 작업 원장에도 기록된 failure).
- Regression: draft-form reviewer 선택을 `mousedown` → `mouseup` → `click` 순으로 발생시켜 셀 label 및 `updatedRows.reviewerId` 반영을 검증했다.
- Frontend: `npm --prefix frontend run build` 성공, 1499 modules transformed.
- Backend focused: controller/service 18 tests passed.
- Backend full: 150 tests, 0 failures/errors, 2 skipped; `BUILD SUCCESS`.
- Browser: 375/768/1280px에서 row form 및 Grid cell picker를 확인했다. 후보에 프로필/직급/부서 fixture가 표시되고 검색/empty state가 동작했다.
- Grid cell popup은 `bottom-start`로 cell 왼쪽 선에 맞춰 시작한다. 593px에서 cell/popup left `274px`, popup right `585px`; 1280px에서 cell/popup left `821px`, popup right `1141px`였다. 오른쪽 가용 폭에 따라 popup 너비가 조정됐다.
- 브라우저 fixture에서 다른 사용자 선택 후 셀 표시와 저장 dirty 상태가 갱신되고, 기존 사용자 재선택 후 dirty 상태가 해제됨을 확인했다.
- Row form popup bounds는 375px `39..359`, 768px `71..391`, 1280px `199..519`; 375px form modal은 full-screen이다.
- 375/768/1280px 모두 document/body 가로 overflow가 없다. Grid cell 편집은 cell focus outline을 사용하고 내부 TextField outline을 제거했으며 row form modal은 기존 outlined field 스타일을 유지한다.
- 공유 브라우저의 현행 사용자 응답은 직급/부서 metadata가 없어 해당 live record에서는 이름/프로필만 표시됐다. fixture 캡처에서는 직급/부서 보조 표시를 확인했다.

## 데이터베이스 근거

읽기 전용 PostgreSQL MCP에서 `tb_login_account.profile_image`, `tb_user.level_id`, `tb_common_code_item`/`tb_common_code_group`의 `LEVEL` 계약 및 `tb_department.department_nm`을 확인했다. 기존 tenant 및 활성 조건을 보존했고 테이블/컬럼/DDL 변경은 하지 않았다.

## 화면 캡처

- [375px 사용자 form picker](./screenshots/user-form-375px.png)
- [768px 사용자 form picker](./screenshots/user-form-768px.png)
- [1280px 사용자 form picker](./screenshots/user-form-1280px.png)
- [593px Grid cell picker](./screenshots/user-cell-593px.png)
- [1280px Grid cell picker](./screenshots/user-cell-1280px.png)
