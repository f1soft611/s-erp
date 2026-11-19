# 잔여 의존성 실제 수정 경로 확인 결과

- [작업지시서](../../../directions/20261118/20261118_027_dependency-remediation-boundary_작업지시서.md)
- [계획서](../../../plan/20261118/20261118_027_dependency-remediation-boundary_계획서.md)
- [상세사양](../../../spec/20261118/20261118_027_dependency-remediation-boundary_상세사양서.md)
- 상태: **BLOCKED — 지원되는 실제 artifact 수정 경로 미확보. 권고 두 건을 해결했다고 표시하지 않는다.**

## 추가로 확인한 경로

| 항목 | 실제 확인 |
| --- | --- |
| picomatch | registry latest 4.0.7, 공식 patched version 없음 |
| 공식 권고가 참조하는 [micromatch/picomatch#194](https://github.com/micromatch/picomatch/pull/194) | OPEN, merge commit/mergedAt 없음. 공식 채택된 수정으로 취급 불가 |
| ExcelJS stable | 4.4.0 → uuid ^8.3.0 |
| ExcelJS 공식 prerelease | 4.4.1-prerelease.0 → uuid ^8.3.0. prerelease로 바꿔도 해당 범위가 그대로임 |
| [exceljs/exceljs#3085](https://github.com/exceljs/exceljs/pull/3085) | uuid 11 전환 제안, OPEN/미병합 |
| [exceljs/exceljs#3073](https://github.com/exceljs/exceljs/pull/3073) | patched uuid 11.1.1 제안, CLOSED이지만 미병합 |

## 단순 override를 적용하지 않은 추가 이유

실제 설치된 ExcelJS 4.4.0은 browser entry가 `./dist/exceljs.min.js`인 사전 빌드 배포물이다. 읽기 전용 검사에서 해당 bundle에 uuid v3/v5 export marker와 관련 namespace constant가 존재함을 확인했다.

**npm 설치 graph의 uuid를 11.x로 override하는 것만으로 이 vendor browser bundle을 다시 빌드하지는 않는다.** 따라서 audit의 설치 graph 경고가 줄어도 실제 브라우저 artifact 수정까지 완료했다고 주장할 수 없다. 이 사실을 생략한 숫자 정리는 하지 않았다. marker 검사는 전체 악용 가능성/불가능성이나 내부 uuid의 정확한 버전을 증명하는 검사도 아니다.

## 변경 및 재개 조건

- package.json/lock·lint 설정·업무 소스·workflow 변경 및 의존성 설치는 없다. 외부 metadata와 기존 vendor artifact만 읽었다.
- 공식 patched release가 나오면 소비자 호환 범위와 실제 import artifact를 검증해 적용한다.
- 그 전 직접 해결하려면 검토된 source fork/vendor 재빌드·공급망 관리·Excel 전체 회귀 검증을 포함하는 별도 도입 결정이 필요하다. 지원되지 않는 미병합 PR이나 제3자 fork를 현재 요청의 최소 수정으로 임의 채택하지 않았다.
- [기존 권고 결과 023](20261118_023_dependency-advisories_결과.md)의 두 고유 권고는 그대로 남는다. 개발 서버 loopback 기본값도 유지하며 외부 공개·신뢰하지 않는 glob 사용은 피해야 한다.
- UI/DB/API 변경이 없는 조사 단위여서 신규 화면 스크린샷·DB MCP/SQL 대상이 아니다. lint 정리는 이 차단과 독립적으로 계속한다.

```text
docs: verify upstream dependency remediation boundaries

- 공식 prerelease와 미병합 upstream 패치 상태 확인
- 설치 graph override와 사전 빌드 browser artifact의 차이 기록
- 해결되지 않은 두 권고와 재개 조건을 명시
```
