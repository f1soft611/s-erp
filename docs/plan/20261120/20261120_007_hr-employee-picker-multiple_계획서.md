# 20261120_007 사원 선택 도움창 다중 선택 계획서

기준: [작업지시서](../../directions/20261120/20261120_007_hr-employee-picker-multiple_작업지시서.md)

1. 타입: `EmployeePickerDialogProps`를 단일(`selectionMode?: 'single'`, `onChange`, `onClear`)과 다중(`selectionMode: 'multiple'`, `onApply`, `selected`, `maxSelect`)의 합집합 타입으로 나눈다.
2. 컴포넌트: 선택 상태(사원 ID → 사원 값)를 도움창이 들고 열 때마다 초기값으로 되돌린다. 다중이면 표 맨 앞에 체크 열, 안내 줄에 "현재 목록 전체 선택/선택 해제", 푸터에 "선택 N명"과 "적용(N명)/취소".
3. 테스트·문서·결과.

위험: 도움창이 다중이어도 단일 동작(더블클릭 선택, 선택 해제 버튼)은 그대로여야 한다. 오른쪽 영역 높이 고정은 유지한다(메시지는 안내 줄 한 곳에서만 바뀐다).
