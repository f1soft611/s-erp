# 잔여 의존성 수정 경로 판정 상세사양

## 판정 gate

| gate | 요구 근거 |
| --- | --- |
| 신뢰 가능한 수정 | 공식 patched release 또는 검토 가능한 채택된 upstream 수정. 미병합 제안은 공식 지원 버전과 구별 |
| 호환성 | 실제 소비자의 기존 API/환경 계약과 Excel 입출력 유지 |
| artifact 일치 | 설치 dependency뿐 아니라 앱이 실제 import하는 browser artifact에도 수정 반영 |
| 진실한 보고 | audit가 git/fork/prebundle을 분석하지 못해 사라진 경고를 수정 완료로 과장하지 않음 |

picomatch는 공식 patched version이 없고 참조 PR도 미병합이다. ExcelJS 공식 stable/prerelease는 uuid 8.x 범위를 유지한다. uuid의 첫 patched 11.1.1을 강제 주입해도 ExcelJS의 사전 빌드된 browser artifact를 재빌드하는 것은 아니다.

## 범위와 한계

bundle marker 존재 여부는 해당 코드 경계가 남아 있음을 보이는 근거다. 앱의 모든 입력/호출을 대상으로 한 악용 가능·불가능 증명은 아니다. 새 공격 재현이나 실제 서비스 대상 검사는 하지 않는다.

라이브러리 fork·대체 도입은 공급망/브라우저 재빌드와 Excel 회귀 검증을 포함하는 별도 구현이다. 이 단위에서 임의로 코드를 vendoring하거나 지원되지 않는 PR을 고정하지 않는다. 막힌 gate는 BLOCKED로 남기고, 다른 lint 수정은 계속한다.
