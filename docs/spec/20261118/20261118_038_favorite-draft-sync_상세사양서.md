# 즐겨찾기 편집 초안 동기화 상세사양서

## 근거와 경계

[작업지시서](../../directions/20261118/20261118_038_favorite-draft-sync_작업지시서.md)와 [계획](../../plan/20261118/20261118_038_favorite-draft-sync_계획서.md)에 따른 상태 phase 변경이다. 기준 화면은 기존 `MenuFavoriteEditDialog` 자체이며 CommonDialog/스타일/DOM/이벤트를 그대로 유지한다. 서비스·API 데이터 계약·DB는 변경하지 않으므로 이번 작업은 DB MCP/SQL 대상이 아니다.

## 초기화 계약

| 조건 | 초안 동작 |
|---|---|
| 첫 열린 mount | `favoriteName?.trim() || menuName`, nullable 폴더는 `'root'`, 오류 없음 |
| favoriteId / favoriteName / folderId / menuName / open 중 값 변경 + open | 동일 식으로 이름·폴더 초기화, 오류 제거; 첫 commit부터 반영 |
| 닫힘/닫힌 동안 대상 변경 | 이전 입력 key만 갱신하고 편집 state는 유지; 재개방 시 현재 대상 반영 |
| favorite 객체 참조만 변경, menuId/URL/폴더 목록/콜백 변경 | 입력·오류 유지 |
| 입력/선택 이벤트 | 사용자 초안을 수정하며 prop 초기화로 저장/제거 콜백을 호출하지 않음 |

기존 React dependency의 `Object.is` 의미를 유지한다. 원문 favoriteName과 menuName은 trim 결과가 같더라도 원래 key 값이 바뀌면 초기화한다. 목록 참조를 dependency에 추가하지 않는다.

## 보존 계약과 검증

- 이름은 trim 후 1~100자, 폴더는 문자열에서 숫자 또는 null로 변환한다.
- 저장/제거 요청 중 중복 제출과 닫기를 막는 기존 submitting 동작, 성공 후 닫기, 실패 시 입력/모달/오류 보존을 유지한다. 새 요청 취소/전환 정책은 추가하지 않는다.
- 읽기 전용 URL, 조건부 제거, 더보기, 제목/크기/버튼/레이아웃/접근성 props는 변경하지 않는다.
- 첫 commit은 Profiler 관찰로 검증한다. 기존 서비스/트리/우클릭/권한/메뉴 선택 회귀도 유지한다.
- 실제 브라우저는 합성 값의 실제 CommonDialog와 편집창을 사용하며 3폭의 겹침/가로 넘침과 native 입력/선택/버튼 동작을 확인한다. 서버 연동 전체 검증으로 표현하지 않는다.
