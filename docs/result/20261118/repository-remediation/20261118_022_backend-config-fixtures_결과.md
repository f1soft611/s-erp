# 백엔드 비공개 설정 의존 테스트 분리 결과

- [작업지시서](../../../directions/20261118/20261118_022_backend-config-fixtures_작업지시서.md)
- [계획서](../../../plan/20261118/20261118_022_backend-config-fixtures_계획서.md)
- [상세사양](../../../spec/20261118/20261118_022_backend-config-fixtures_상세사양서.md)
- 상태: **전체 backend clean test failure 0/error 0**, 기존 제외 3개 유지.

## 원인과 최소 변경

기존 MinIO 테스트는 비공개 dev/prod profile을 직접 읽어 실제 배포 기본값 snapshot을 검사했다. Swagger 테스트도 private dev profile을 직접 읽었다. clean checkout에서는 두 NoSuchFile 오류가 발생했다.

- MinIO는 실제 factory parameter의 네 Value annotation과 기존 설정/환경변수 fallback 이름을 reflection으로 검사한다. 실제 기본값은 출력하거나 기대값으로 복사하지 않는다.
- 시스템 환경·profile을 읽지 않는 두 MockEnvironment에 실 계정과 무관한 인메모리 값을 제공한다. Spring의 실제 DependencyDescriptor 해석으로 상위 설정 우선과 환경변수 fallback을 검증하고 실제 MinioClient bean을 생성한다. storage API나 실제 서비스 연결은 호출하지 않는다.
- Swagger는 tracked common application.properties의 공개 기본 패키지 집합을 검증한다. whitelist·component scan·MinIO SDK 중복/지원 버전 검증은 유지했다.

**검증 경계 변경:** 실제 private profile의 provider/bucket/기본 자격 증명 등 배포값 snapshot 검사는 더 이상 단위 테스트의 보장 대상이 아니다. 이것을 실제 dev/prod 배포 설정 확인이나 실제 storage 인증 성공으로 표현하지 않는다. 운영 설정·기본값·보안 정책 자체는 바꾸지 않았다.

## 검증

| 실행 | 결과 |
| --- | --- |
| 수정 전 현재 tracked 입력, 두 설정 파일 | 5개 중 error 2개 재현 |
| 수정 후 같은 두 파일 | **5/5 통과** |
| 최초 전체 실행 | 1,286개, failure 1/error 0/skip 3. 아래 격리 snapshot 문제 |
| canonical 입력 정합성 보정 후 전체 mvn clean test | **1,286개, failure 0/error 0/기존 skip 3**, exit 0 |
| 전체 운영 Java API --release 8 clean compile | exit 0 |

최초 전체의 유일한 failure는 SystemPolicySqlContractTest의 복제 파일 byte 비교였다. root의 docs/database와 backend/DATABASE 다섯 원본은 모두 byte hash가 같았으나, 오래된 소유 검증 worktree의 docs 쪽 복사만 달랐다. **원본 일치를 먼저 확인하고 소유 worktree의 다섯 복사만 최신 원본으로 맞췄다.** 테스트·SQL·원본 DB 문서를 수정해 통과시킨 것이 아니다. 최초 실패 로그와 최종 GREEN 요약은 별도로 보존했다.

최종 backend tracked 소스는 현재 root 기준이며 private profile·.env를 복사하거나 생성하지 않았다. 운영 Java/설정/POM/API/DB 및 frontend 변경은 없고, 신규 skip/retry도 없다. 기존 세 제외를 새 통과로 세지 않는다.

## 한계와 후속

- 신규 운영 Java가 없으며 별도 Java 8 API compile도 확인했다. 실제 Java 8 runtime·실DB·실storage 검증은 별개다.
- DB/API 계약을 구현·수정하지 않았으므로 이 작업은 DB MCP/SQL migration 대상이 아니다. snapshot 정합성 보정은 원본 SQL 변경이 아니다.
- UI 변경이 없는 테스트 전용 작업이므로 신규 스크린샷 대상이 아니다. 이전 15개 화면 증거를 보존한다.
- 프론트 전체 CI 2,641개 통과 이력은 [결과 021](20261118_021_document-detail-readiness_결과.md)에 남겼다. 이번 backend 테스트 변경이 frontend를 수정하지 않았다.
- 다음 순서는 잔여 npm advisory의 현재 패치·의존 경로 확인과 호환 범위의 조치다.

## 복사용 커밋 문구

```text
test(backend): decouple configuration checks from private profiles

- 실제 MinIO 설정 주입을 격리된 인메모리 fixture로 검증
- 공개 Swagger 기본 설정과 기존 보안 범위 검증 유지
- 전체 backend 오류 0 및 기존 제외·배포 검증 한계 기록
```
