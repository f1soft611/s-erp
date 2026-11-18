# 잔여 의존성 권고 재평가 상세사양

## 근거와 판정

| 항목 | 현재 계약과 완료 기준 |
| --- | --- |
| 입력 | 현재 root와 소유 검증 환경의 package.json/package-lock.json byte hash 일치 |
| 전체 audit | 취약 경고를 숨기지 않고 severity별 영향 패키지 수와 고유 GHSA 수를 각각 기록 |
| 배포 집합 | npm audit --omit=dev 결과를 전체 audit와 구별. 브라우저 실제 도달성 보장으로 과장하지 않음 |
| picomatch | GHSA-fc5q-39xc-vjpf의 현재 영향/패치 범위와 registry 최신 버전 비교 |
| uuid | GHSA-w5hq-g745-h8pq의 패치 범위와 ExcelJS의 선언된 uuid 범위 비교 |
| 조치 제한 | 지원되는 호환 수정만 허용. 강제 major override, audit fix --force, major downgrade 금지 |
| 미해결 | 공식 패치 부재·상위 의존 범위 제약은 잔여 권고로 남기고 다음 재개 조건을 명시 |

## 읽기 전용 경로 확인의 경계

앱 직접 import와 현재 설치된 ExcelJS lib의 uuid 호출을 확인한다. advisory가 명시한 영향 함수와 비교하되, 이는 전체 배포 bundle·모든 간접 호출·향후 버전에 대한 악용 불가능 증명이 아니다. 악성 입력이나 실제 서비스 대상의 공격 재현은 수행하지 않는다.

manifest/lock/운영 코드가 바뀌지 않으면 새 화면 동작·API·DB 계약·스크린샷 대상이 없다. 기존 전체 테스트 결과의 정확한 코드와 이번 추가 변경 0을 분리해 기록한다.
