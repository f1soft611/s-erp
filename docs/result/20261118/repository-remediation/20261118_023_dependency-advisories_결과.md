# 잔여 의존성 권고 재평가 결과

- [작업지시서](../../../directions/20261118/20261118_023_dependency-advisories_작업지시서.md)
- [계획서](../../../plan/20261118/20261118_023_dependency-advisories_계획서.md)
- [상세사양](../../../spec/20261118/20261118_023_dependency-advisories_상세사양서.md)
- **판정: 지원되는 호환 패치 경로가 없어 의존성을 강제로 변경하지 않았다. 고유 권고 두 건은 미해결이다.**

## 현재 exact-lock 결과

| 조회 | 현재 결과 |
| --- | --- |
| npm audit --json | 영향 패키지 9개: high 7/moderate 2. 고유 GHSA는 2건 |
| npm audit --omit=dev --json | ExcelJS/uuid 두 패키지, moderate 2. 고유 GHSA는 1건 |
| audit 종료 코드 | 둘 다 1. 취약 경고가 남아 있으므로 정상 통과로 표시하지 않음 |

위 수치는 아홉 개의 서로 다른 취약점이라는 뜻이 아니다. picomatch 경로의 일곱 패키지는 현재 dev 집합이고, 배포 의존성으로 남는 것은 ExcelJS/uuid 경로다. dev 제외 결과가 전체 브라우저 bundle의 악용 가능성까지 판정하는 것은 아니다.

## 두 권고와 적용하지 않은 변경

| 권고 | 현재 경로·공식 근거 | 결정 |
| --- | --- | --- |
| [picomatch GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) | 설치/registry 최신 모두 4.0.7. 공식 영향 범위 <=4.0.7, first_patched_version 없음. Vite/Vitest/rolldown 및 tinyglobby/fdir의 dev 경로 | 공식 패치 대기. Vite/Vitest/React plugin major downgrade나 force fix를 적용하지 않음 |
| [uuid GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | ExcelJS 최신 4.4.0 → 선언 ^8.3.0 → 설치 8.3.2. 이 범위의 첫 패치는 11.1.1이며 다른 영향 major의 패치는 12.0.1/13.0.1 | 상위 지원 범위 내 패치 없음. uuid 최신 14.0.3 강제 주입·11.x major override·ExcelJS 3.4.0 downgrade를 적용하지 않음 |

공식 uuid 공지는 v3/v5/v6의 외부 buffer 경계 검사를 영향 대상으로 명시하고 v4는 구별한다. 현재 설치된 ExcelJS lib의 uuid 참조는 `cf-rule-ext-xform.js`에서 인수 없는 v4 호출 두 곳이며, 앱 src에 직접 uuid import는 없다. 앱의 ExcelJS import는 공통 Grid Excel export 및 거래처별 품목 단가 Excel 서비스다. **이는 확인한 lib 호출 범위의 근거일 뿐, 배포 minified bundle 전체의 도달성·악용 불가능 증명이나 패키지 취약 경고 해소는 아니다.**

## 재개 조건과 운영상 주의

1. picomatch 공식 patched release가 발표되면 현재 소비자의 semver 범위 안에서 lock 갱신 가능 여부부터 확인하고 관련 도구 테스트·lint/typecheck/build를 수행한다.
2. ExcelJS가 patched uuid를 지원하는 정식 버전을 내면 기존 Excel 입출력 회귀와 Grid/단가 화면 관련 검증 후 업데이트한다. 그 전의 독립 major 교체는 별도 호환성 판단이 필요하다.
3. dev 도구를 외부에 공개하거나 신뢰하지 않는 glob을 입력받는 사용을 피한다. 현재 dev script의 loopback host 기본값은 변경하지 않았다.

## 전체 작업의 현재 경계

- 입력 검증: root와 소유 검증 환경의 manifest/lock 두 byte hash 일치, 변경 문서 6개의 상대 링크 오류 0. frontend/workflow는 전체 GREEN 코드 8937faec 이후 차이 0이고 backend는 검증한 7f7a7a45 이후 차이 0이다. 공유 서버는 HTTP 200으로 유지했고 중지·재시작하지 않았다.
- frontend: [결과 021](20261118_021_document-detail-readiness_결과.md)의 전체 원격 CI **226파일/2,641개 통과**와 lint/typecheck/build 통과를 보존했다. 해당 문서 후속 커밋 4e1cfd71의 원격 CI도 success를 확인했다.
- backend: [결과 022](20261118_022_backend-config-fixtures_결과.md)의 **1,286개, failure 0/error 0/기존 skip 3** 및 Java 8 API clean compile을 확인했다. 단위 커밋 7f7a7a45를 non-force push했다.
- 이번 재평가는 문서만 변경했다. 새 의존성 설치·manifest/lock·화면·API·DB·workflow 변경은 없다. 고유 권고 두 건과 실제 배포 profile/실DB/실storage/실 Java 8 runtime 미확인은 해결됐다고 표시하지 않는다.
- 별도 UI 변경이 없어 신규 스크린샷 대상이 아니다. 기존 화면 증거를 보존한다. 별도 Actions 런타임/runner 전환 경고는 기존 후속 사항이며 여기서 workflow를 임의 변경하지 않았다.

## 복사용 커밋 문구

```text
docs: record residual dependency advisory decisions

- 현재 lock의 두 고유 권고와 dev/배포 영향 경로 구별
- 공식 호환 패치 부재와 강제 major 변경 보류 근거 기록
- 백엔드 검증 완료 단위와 남은 검증 경계 연결
```
