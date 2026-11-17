# 편집 가능 multiline 읽기전용 배경 오적용 상세사양서

## 원인

- 견적 비고는 `disabled={!isEditable}`을 사용하며 작성/수정 권한이 있으면 편집 가능하다.
- 공통 테마는 `:has(textarea[readonly])`로 읽기전용 입력을 탐지한다.
- MUI TextareaAutosize는 실제 편집 textarea와 별도로 `aria-hidden="true" readonly`인 높이 측정 textarea를 렌더링한다. 이 숨김 요소로 인해 편집 가능한 비고까지 읽기전용 배경을 받는다.

## 변경

- 공통 MuiInputBase의 textarea 읽기전용 탐지는 `textarea[readonly]:not([aria-hidden="true"])`만 대상으로 한다.
- 실제 읽기전용 또는 비활성 입력, light/dark 테마의 기존 `action.disabledBackground`, 선택 가능한 마스터 입력 예외는 보존한다.
- 견적의 권한·폼 데이터·저장·상태 로직은 변경하지 않는다. 다른 화면의 편집 가능한 multiline에도 동일한 잘못된 배경만 제거된다.
- 새로운 데이터/DB/API 계약과 의존성 추가는 없다.

## 검증

- light/dark 각각 편집 가능 multiline은 readonly 배경을 받지 않고 입력 가능하다.
- 실제 readOnly 또는 disabled multiline은 기존 readonly 배경을 유지한다.
- 실제 견적작성 375/768/1280px에서 비고 입력과 편집 가능한 참조 입력의 배경이 같고 페이지 가로 overflow가 없다.
- 견적 상세보기에서는 비고와 날짜 등 기존 비활성 필드가 같은 읽기전용 배경을 유지한다.
