# 백엔드 설정 테스트 격리 상세사양서

- [계획서](../../plan/20261118/20261118_022_backend-config-fixtures_계획서.md)
- [작업지시서](../../directions/20261118/20261118_022_backend-config-fixtures_작업지시서.md)
- 추천안은 테스트 소유 fixture와 공개 설정 검증이다. 실제 배포 profile을 테스트에 복사하는 안은 비공개 설정 유출 위험으로, 누락 시 skip하는 안은 실패 은폐로 배제한다.
- MinIO 설정 소유 계약은 실제 factory의 네 parameter와 storage.* → 기존 환경변수 fallback 구조다. 두 MockEnvironment를 사용해 primary 값 우선과 fallback 값 해석을 검사한다.
- fixture는 실 계정·저장소와 관계없는 가상 값만 인메모리로 만든다. 실제 annotation의 fallback 문자열·주입 값·client 내부 상태는 로그나 단언 메시지에 출력하지 않는다.
- Spring context에는 MinioStorageConfig만 등록한다. Boot profile·component scan·DB·실 storage 호출은 없다. actual MinioClient 생성만 실행한다.
- 기존 private profile의 provider/bucket/기본 자격 증명 등 배포값 snapshot 검사는 대체된 것으로 명시한다. 새 테스트가 실제 dev/prod 배포값을 보증한다고 표현하지 않는다.
- Swagger 기본값은 public tracked common resource에서 Properties로 읽고 기존 두 패키지의 정확한 집합을 검증한다. 실제 profile override까지 확인한 것으로 표현하지 않는다.
- 기존 whitelist와 component scan 검증·SDK 중복/지원 버전 검증은 보존한다.
- 운영 코드·설정·공개 API·DB·의존성 변경이 없으므로 DB MCP/SQL migration과 UI 스크린샷은 대상이 아니다.
