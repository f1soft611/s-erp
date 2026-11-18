# 수주 확인창 종료 대기 결과

- [작업지시서](../../../directions/20261118/20261118_024_sales-order-dialog-readiness_작업지시서.md)
- [계획서](../../../plan/20261118/20261118_024_sales-order-dialog-readiness_계획서.md)
- [상세사양](../../../spec/20261118/20261118_024_sales-order-dialog-readiness_상세사양서.md)
- 현재 상태: **관련 UTC 테스트 3파일/52개 통과. 수정 코드의 원격 전체 확인 전이다.**

## RED와 원인

원격 7f7a7a45 / [run 44259145046](https://github.com/f1soft611/s-erp/actions/runs/44259145046)은 lint/build 통과, 테스트 파일 225/226 통과였으며 수주등록 신규 초기화 한 사례가 실패했다. 직전 전체 GREEN 이후 frontend 코드·의존성 변경은 없었다.

견적번호 reset을 label 기반으로 먼저 기다렸지만, 그 조건은 아직 닫히는 확인창 뒤의 숨겨진 폼에서도 성립한다. 이어 accessible role로 거래처 textbox를 조회하는 순간에는 MUI Dialog/Modal이 남아 배경 접근성이 복귀하기 전이었다. 공통 confirm hook이 닫힘 요청과 동시에 promise를 resolve하고 수주 페이지가 이어 reset하는 실제 흐름과 일치한다.

## 최소 수정과 기존 계약 보존

같은 테스트의 취소 분기에 이미 있던 실제 dialog 부재 대기를 확인 분기에도 **한 줄 추가**했다. 운영 페이지·CommonDialog·hook·Grid를 변경하지 않았다. hidden 조회 우회, sleep, timeout 상향, retry, skip은 없다.

- 기존 신규 취소/확인·헤더/상세 초기화·날짜 호출 수·재신규 단언은 그대로다.
- AST 비교: it 직접 호출 **34 → 34**, expect 직접 호출 **163 → 164**. 기존 단언 삭제 없이 dialog 부재 확인 하나만 추가했다. 매개변수 사례를 펼친 해당 파일의 실제 실행은 36개다.
- root/소유 검증 환경의 frontend tracked 865개 byte hash 불일치 0이다. 원래 GREEN 대비 운영 frontend/src·backend/src/main·manifest/lock·workflow 차이 0이다.

## 검증

| 검증 | 결과 |
| --- | --- |
| UTC, CI와 같은 threads/2 workers: 수주등록·공통 확인 hook·CommonDialog | **3파일/52개 통과**, failure 0/skip 0 |
| 기존 lint | exit 0, error 0. 기존 warning 행 206개는 별도 정리 대상이며 삭제·숨김 처리하지 않음 |
| 원래 테스트 코드와 diff | 1행 추가/삭제 0 |
| 원격 전체 | 코드 단위 push 뒤 확인 예정 |

기존 act 경고가 있는 관련 사례도 그대로 실행했다. 이번 준비 조건과 무관한 경고를 없애려 운영 코드나 테스트 범위를 변경하지 않았다.

이전 [backend 결과 022](20261118_022_backend-config-fixtures_결과.md)의 전체 1,286개 failure 0/error 0/기존 skip 3 및 Java 8 API clean compile은 그대로 유효하다. [의존성 결과 023](20261118_023_dependency-advisories_결과.md)의 두 고유 권고는 호환 패치가 없어 남아 있다. UI 동작·반응형 변경이 없는 테스트 전용 수정이므로 신규 스크린샷 대상이 아니다.

## 복사용 커밋 문구

```text
test(sales): await confirmation exit before querying reset fields

- 신규 확인창의 실제 종료를 기다린 뒤 접근 가능한 폼 검증
- 기존 수주 초기화·날짜·행·재신규 단언 모두 보존
- 운영 코드와 timeout/retry/skip 변경 없음
```
