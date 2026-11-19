# 수주 확인창 종료 대기 상세사양

## 재현과 원인

7f7a7a45의 Frontend CI 44259145046에서 `sales-order-create-page.test.tsx`의 `resets the header and detail grid with the new button after confirming unsaved changes`가 line 818에서 accessible 거래처 textbox를 찾지 못했다. 직전의 label 기반 견적번호 초기화 검사는 통과했고 실패 DOM에는 MUI Dialog/Modal이 남아 있었다.

공통 confirm hook은 request를 null로 설정하면서 promise를 resolve한다. 수주 페이지는 그 promise 뒤 resetToNewOrder를 실행한다. 필드 reset은 Dialog의 exit/unmount 및 배경 aria-hidden 복원보다 먼저 관찰될 수 있다. label 기반 필드 조회만으로 배경 폼의 accessible 준비를 보장할 수 없다.

## 최소 변경 계약

- 변경 파일은 `frontend/tests/sales-order-create-page.test.tsx` 하나다.
- 확인 버튼 클릭 뒤 `waitFor`로 `queryByRole('dialog')`가 문서에서 사라짐을 기다린다. 동일 사례의 취소 분기에 이미 있는 패턴을 사용한다.
- 견적번호·거래처·일자·시스템 날짜 호출 수·상세 행 초기화·재신규 무확인 단언과 case 수를 보존한다. dialog 부재 단언 하나만 추가한다.
- 실제 페이지/confirm/CommonDialog/Grid는 그대로 사용한다. mock 교체, hidden:true 우회, sleep, timeout 상향, retry, skip은 없다.

## 검증 경계

원격 실패를 RED 근거로 보존하고 관련 테스트 묶음과 lint를 확인한다. 이후 실제 코드 단위 전체 CI의 파일/사례 수·실패 수를 확인한다. UI/반응형 동작·API·DB를 변경하지 않는 테스트 준비 조건 수정이므로 신규 화면 스크린샷 대상이 아니다.
