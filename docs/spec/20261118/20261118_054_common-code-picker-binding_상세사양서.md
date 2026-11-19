# 공통코드 상위 picker 이벤트 바인딩 상세사양서

[작업지시서](../../directions/20261118/20261118_054_common-code-picker-binding_작업지시서.md) → [계획서](../../plan/20261118/20261118_054_common-code-picker-binding_계획서.md)를 따른다.

| 조건/이벤트 | 유지할 계약 |
| --- | --- |
| render | factory는 boolean으로 메타데이터만 구성, picker 조회/ref 접근 없음 |
| 상위 그룹 있고 저장 중 아님 | parentItemNm code 편집과 기존 지연 picker 이벤트 활성 |
| 상위 그룹 없음 | 상위코드 편집 불가·callback undefined |
| saving | 기존 모든 editable=false·onBeforeEdit/비동기 save guard 유지 |
| 열기 | 기존 parentGroupId 조회·현재 행 제외·응답 후 save guard |
| 취소/재열기/선택 | 취소는 patch 없음, 재열기는 기존 callback 교체, 선택은 parentItemId/parentItemNm patch |
| 오류 | 기존 onError 문구/흐름 유지 |
| 그 외 | 상세 행·미저장/저장·그룹 선택·삭제 정책·세션·반응형 그대로 |

same-file 비공개 factory의 인자만 callback에서 boolean으로 바뀐다. 실제 이벤트 callback은 명시적 컬럼 객체 조립에 남기며 undefined 반환을 유지한다. ref lifecycle이나 async 순서는 변경하지 않는다. F1Grid/F1Tree 공통 소스·서비스/API/DB/의존성을 변경하지 않는다.

기존 factory는 callback을 즉시 실행하지 않는다. 보존 회귀는 기존 구현에서도 통과해야 하며 runtime 결함을 고쳤다고 확대하지 않는다. 이 파일의 나머지 render 삭제 guard ref 진단은 이번에 숨기거나 변경하지 않는다.
