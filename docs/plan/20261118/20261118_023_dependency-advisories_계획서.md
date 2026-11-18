# 잔여 의존성 권고 재평가 계획

## 목표와 범위

새 기능·API·DB를 만들지 않는다. backend 전체 검증 뒤 남은 두 고유 권고에 대해 안전한 업데이트 가능 여부와 미해결 사유를 확정한다.

1. 현재 lock의 npm audit와 dev 제외 audit를 각각 보관한다.
2. registry 최신 버전 및 GHSA 공식 패치 범위를 교차 확인한다.
3. 실제 설치 경로와 앱 직접 import, ExcelJS의 uuid 사용 범위를 읽기 전용으로 확인한다.
4. 호환 수정이 없으면 manifest/lock을 유지하고 결과·후속 조건을 기록한다.
5. root/검증 환경의 입력 일치, 문서 상대 링크, 변경 범위와 원격 동기화를 확인한다.

## 확인 상태

- [x] 전체 9개 영향 패키지와 고유 권고 2건을 구별했다.
- [x] dev 제외 결과는 ExcelJS/uuid 두 패키지, 고유 권고 1건이다.
- [x] picomatch 최신 4.0.7에도 공식 패치가 없고, ExcelJS 최신 4.4.0은 uuid ^8.3.0을 요구함을 확인했다.
- [x] uuid의 첫 패치 11.1.1은 ExcelJS가 선언한 major 범위를 벗어난다.
- [x] 강제 override/downgrade/설치 없이 현 상태와 남은 조치를 문서화했다.
- [x] exact manifest/lock 두 hash가 같고, 변경 문서 6개의 상대 링크 오류가 0임을 확인했다. 검증된 frontend/backend 코드와 추가 차이가 없다.

문서 범위만 별도 커밋·non-force push하고, 최종 응답 전에 remote HEAD 일치와 working tree 청결을 확인한다.
