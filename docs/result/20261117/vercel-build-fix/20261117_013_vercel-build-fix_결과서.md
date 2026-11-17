# Vercel 프론트엔드 빌드 오류 수정 결과

## 범위와 원인

- [작업지시서](../../../directions/20261117/20261117_013_vercel-build-fix_작업지시서.md), [계획서](../../../plan/20261117/20261117_013_vercel-build-fix_계획서.md), [상세사양서](../../../spec/20261117/20261117_013_vercel-build-fix_상세사양서.md).
- 수정 전 `frontend`의 `npm run build`로 사용자 오류를 재현했다. 최근 소수점 설정 확장에서 `F1GridColumn.options` 선언이 삭제되어 업무 컬럼·편집기·행 폼·검색의 타입 추론이 연쇄 실패했다.
- `options?: F1GridOption[]`를 복원했다. 호출부의 `any` 우회나 개별 타입 단언 없이 관련 TS2353/TS2339/TS7006을 함께 해결한다.
- 견적현황 `amountColumn`의 `width` 적용을 복원해 TS6133을 해결했다. 소수점 정책 상속은 그대로 유지한다.
- 로컬에서 함께 발견된 공통코드 빌드 차단도 수정했다: 패널의 기존 `searchQuery` prop, `그룹 설명` 헤더 복원 및 샘플 그룹 세 개의 필수 `moduleCd: ''` 보완.
- API·백엔드·DB·의존성 변경 없음. DB MCP/SQL/롤백 대상 아님. 커밋·푸시·Vercel 재배포는 수행하지 않았다.

## 검증

작업 위치: `frontend`.

| 검증 | 결과 |
| --- | --- |
| `npm run build` | 성공(exit 0), TypeScript 및 Vite 프로덕션 빌드 완료 |
| `npm run test -- tests\f1-grid.test.tsx tests\f1-grid-form-modal.test.tsx tests\page-search-fields.test.ts tests\quotation-status-page.test.tsx tests\common-code-management-page.test.tsx tests\grid-decimal-policy.test.tsx` | 6개 파일, 293개 테스트 성공 |
| 변경 TypeScript 4개 파일 대상 `npm run lint -- ...` | 성공(exit 0), 오류 없음. 기존 공통코드 패널의 미사용 catch·Fast Refresh·React Compiler·hooks 관련 경고는 범위 밖으로 유지 |
| `git diff --check` | 성공 |

테스트 실행 시 MUI select 범위 및 React `act` 경고가 출력되었지만 실패는 없었다. 테스트 명령에 덧붙인 `--maxWorkers=2`는 로컬 npm에서 config 경고로 소비되어 Vitest에 전달되지 않았다. 위 표에는 실제 Vitest에 전달된 파일 선택 명령을 기록했다. 타입·기존 설정 복원이므로 상수나 타입 선언 자체를 중복 검사하는 새 단위 테스트 대신 기존 빌드와 선택 편집·폼·검색·소수점 회귀 테스트를 사용했다.

## 브라우저 증빙

기존 실행 중인 iPlusMES 개발 서버(`http://127.0.0.1:4173`)를 재사용했고 종료하지 않았다. 별도 Orca 탭에서 공개 F1-Grid 문서의 Cell Editing 페이지를 375/768/1280px로 확인했다. 각 너비에서 문서의 `options: F1GridOption[]` 계약이 존재하고 페이지 전체 가로 overflow가 없음을 확인했다.

이 증빙은 공개 문서 렌더링 확인이며 로그인 업무 화면의 E2E 검증이나 Vercel 배포 성공을 의미하지 않는다. 업무 흐름은 위 기존 테스트로 확인했다.

- [데스크톱 1280px](screenshots/grid-options-1280.png)
- [태블릿 768px](screenshots/grid-options-768.png)
- [모바일 375px](screenshots/grid-options-375.png)

## 복사용 커밋 메시지

```text
fix: 프론트엔드 배포 빌드 타입 오류 수정

- F1Grid 선택 옵션 타입과 견적현황 컬럼 너비 복원
- 공통코드 패널과 샘플 데이터의 누락 타입 보완
- 관련 문서 및 빌드 회귀 검증 결과 기록
```
