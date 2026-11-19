# 공통코드 상위 선택 callback 결과

## 변경

openParentPicker가 부모 객체 전체 대신 실제 사용하는 동일한 ID 문자열과 null 존재 표지만 캡처하도록 했다. useCallback을 유지하고 의존성은 onError·parentGroupId·saving으로 좁혔다.

상위 그룹 검색/존재 판정, 저장 중 잠금과 재검사, 선택 반영 ref, 현재 행 제외, 비동기 옵션/열기, 오류 문구, 호출부와 JSX는 그대로다. null과 문자열/숫자/0/빈 문자열 등 8가지 입력에서 기존 존재 판정·서비스 인수가 같은지 확인했다. 그룹 ID는 편집 컬럼이 아니다.

## 검증

- 실제 공통코드 페이지 30/30 통과, 실패·제외 0. UTC, threads/worker 2.
- typecheck exit 0. lint 경고 137 → 135개, memoization 두 개만 제거. 다른 진단은 동일하다.
- 지정한 선언·guard·인수·deps 외 코드 변화 없음. 검증 복사와 frontend 890파일 byte 일치.
- 사양 검토: null 전용 guard로 0/빈 ID 보존. 품질 검토: callback이 실제 사용하는 primitive 의존성으로 좁혔으며 억제나 메모이제이션 삭제 없음.
- 레이아웃·기능 변경이 없어 새 스크린샷은 생성하지 않았다. backend·API 계약·서비스·SQL·manifest 변경 없음.

세션 근거: `lint029-related.json`, `lint029-typecheck.log`, `lint029-oxlint.json`, `lint029-parent-audit.json`. 이번 단위는 관련 30개 실행이며 이전 전체 2,641개 실행과 구분한다.

잔여 lint 135개: set-state-in-effect 97, exhaustive-deps 28, refs 10. 의존성 두 권고는 027 차단 근거가 유지된다. 전체 요청은 계속 진행한다.

## 복사할 커밋

제목: `fix: 공통코드 상위 선택 callback 의존성 정리`

내용: `부모 객체 대신 동일한 primitive ID를 캡처해 메모이제이션 경고 2개를 제거하고 실제 공통코드 회귀 30개를 확인한다.`
