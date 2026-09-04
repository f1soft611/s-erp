# 작업 원장

## 작업 정보

- 작업: 권한 관리 F1-Grid 선택·저장·사용자 매핑 흐름 개선
- 경로 분류: `bounded`
- 실행 방식: `Subagent-Driven`
- 작업 환경: 현재 브랜치

## 승인 기록

- 2026-09-04: 작업지시서 승인
- 2026-09-04: 계획서·상세 사양서 구현 승인
- 2026-09-04: 현재 브랜치 작업 승인
- 2026-09-04: 기준선 F1-Grid 테스트 실패 상태에서 원인 조사 및 진행 승인
- 2026-09-04: Subagent-Driven 실행 방식 선택

## 스킬 실행 기록

- Step 1: `01-project-analysis.md` 확인, React/Vite/Vitest 및 Java/eGovFrame 구조 확인
- Step 2: `02-brainstorm.md` 확인, 작업지시서 작성 및 승인
- Step 3: `03-design-validation.md` 확인, 계획서·사양서 작성 및 승인
- Step 4: `04-git-setup.md` 확인, 현재 브랜치 선택 및 기준선 실행
- Step 5: `05-write-plan.md` 확인, 상세 실행 계획 작성
- Step 6: `06-subagent-execution.md` 확인, Subagent-Driven 방식 선택
- Step 7: `07-implementation-tdd.md`, `08-systematic-debugging.md` 확인, TDD·근본 원인 조사 시작
- Step 9: `10-code-review.md` 기준 사양·품질 검토 수행. 역할 전환 확인은 MUI `Dialog`의 기본 모달 동작(`aria-modal="true"`)을 사용하며, 비모달이라는 검토 의견은 DOM 증거와 맞지 않아 반영하지 않음.

## 기준선 검증

| 명령                                                                                 | 결과 | 기록                                                                                                                                                                         |
| ------------------------------------------------------------------------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test -- tests/f1-grid.test.tsx tests/role-management-notification.test.tsx` | 실패 | 2개 파일 중 1개 실패, 117개 테스트 중 20개 실패. `f1-grid.test.tsx`의 기존 편집기 진입 테스트가 입력 요소를 찾지 못함. 이번 태스크 T1의 신규 행 삭제 회귀와 분리해 비교한다. |

## 태스크 상태

| 태스크                             | 상태 | 검증                                                                            | 리뷰                                                |
| ---------------------------------- | ---- | ------------------------------------------------------------------------------- | --------------------------------------------------- |
| T1 F1-Grid 신규 행 삭제 dirty 상태 | 완료 | 신규 회귀 `1 passed`; 전체 F1-Grid는 기존 편집기 실패 20건 유지, 신규 회귀 통과 | 사양 준수 승인, 품질 승인                           |
| T2 역할 선택·상단 제어·역할 저장   | 완료 | 역할 관리 회귀 12건 통과, `npm run build` 통과                                  | 사양 준수 승인, 품질 이슈는 T3 안정성 보강으로 해소 |
| T3 사용자 매핑 추가·저장           | 완료 | 역할 관리 회귀 12건 통과, `npm run build` 통과                                  | 사양 준수 승인, 품질 검토 완료                      |
| T4 문서화·브라우저 검증·최종 검토  | 대기 | 대기                                                                            | 대기                                                |

## T1 실행 기록

- RED: 삽입 행 추가 후 삭제 시 `deletedRows`에 남는 회귀를 확인했다.
- GREEN: `markRowsDeleted`가 삽입 행을 rows와 모든 상태 맵에서 제거하도록 수정했다.
- 검증: `npx vitest run tests/f1-grid.test.tsx -t "removes newly inserted rows from all changes when deleted"` 결과 `1 passed | 114 skipped`.
- 전체 영향: `npm run test -- tests/f1-grid.test.tsx`는 `20 failed | 95 passed`로 기존 편집기 진입 실패 20건이 유지됐다. 신규 회귀 실패는 없다.
- 사양 준수 리뷰: 승인.
- 코드 품질 리뷰: 초기 fixture 필수 필드 누락을 보완한 뒤 승인.

## T2/T3 실행 기록

- 역할 저장: 신규 행은 POST, 기존 수정 행은 PUT으로 저장하고 성공 후 역할 목록을 재조회해 F1-Grid 기준값과 dirty 상태를 초기화한다.
- 역할 선택: `selectedRoleId`와 요청 ID를 기준으로 사용자 매핑을 조회하며, 신규 임시 역할은 매핑 조회·저장을 차단한다.
- 매핑 저장: 체크 변경은 로컬 F1-Grid 변경으로만 보관하고 상단 저장에서 POST/DELETE를 일괄 호출한다.
- 역할 전환: 미저장 매핑이 있으면 계속 편집·저장 후 이동·변경 취소 후 이동을 제공한다. 저장과 재조회가 진행 중인 동안 이동 액션은 비활성화된다.
- 신뢰성: 저장 재진입 잠금과 역할·매핑 완료 작업 ID 체크포인트를 적용해 부분 실패 재시도에서 성공한 API를 중복 호출하지 않는다.
- 테스트: `npm run test -- tests/role-management-notification.test.tsx` 결과 `12 passed`.
- 빌드: `npm run build` 결과 성공. Vite 번들 크기 경고만 존재한다.
- 리뷰: 사양 준수 검토 승인. 코드 품질 검토에서 지적된 저장 전환/부분 실패 문제를 보강했다. `Dialog` 비모달 지적은 MUI 기본 Modal 동작 및 `aria-modal="true"` DOM 증거에 따라 기각했다.

## DB 영향

- DB 스크립트: 해당 없음
- 판단 근거: 기존 `tb_role`, `tb_login_account`, `tb_login_account_role` 및 기존 역할-사용자 매핑 API를 재사용한다. 테이블, 컬럼, 제약조건, 데이터 마이그레이션 변경이 없다.

## T2/T3 실행 및 검토 기록

- 역할 저장은 신규 행 POST와 기존 수정 행 PUT으로 분리했고, 서버 목록 재조회 후 F1-Grid key를 갱신해 dirty 기준값을 초기화했다.
- 매핑 변경은 로컬 F1-Grid 변경으로 보관하고 상단 저장에서만 POST/DELETE 요청을 수행한다.
- 미저장 매핑 상태에서 역할 전환 시 계속 편집·저장 후 이동·변경 취소 후 이동을 제공한다. 저장 및 재조회 중 이동 액션은 비활성화된다.
- 저장 재진입 잠금과 역할·매핑 완료 작업 ID 체크포인트를 적용해 부분 실패 재시도에서 성공한 API를 중복 호출하지 않는다.
- 사양 준수 검토: 승인.
- 코드 품질 검토: 저장 전환과 부분 실패 이슈를 보강했다. `Dialog` 비모달 지적은 MUI 기본 Modal 동작 및 `aria-modal="true"` DOM 증거와 맞지 않아 반영하지 않았다.

## Step 8-10 검증·결과 기록

- `09-verification.md` 확인 후 `npm run test -- tests/role-management-notification.test.tsx`를 실행했다. 결과는 1개 파일, 12개 테스트 통과다.
- `npm run build`를 실행했다. `tsc -b && vite build`가 성공했고 Vite 500 kB 초과 청크 경고만 발생했다.
- `capture-role-management-grid-mapping.js`로 Playwright 캡처를 두 차례 시도했으나, 현재 대시보드 인증/메뉴 초기화 상태에서 `환경설정` 메뉴 locator timeout이 발생해 스크린샷은 생성하지 못했다.
- 기존 전체 `f1-grid.test.tsx`의 편집기 진입 실패 20건은 이번 변경 전 기준선에서 확인된 항목이며 이번 작업에서는 수정하지 않았다.
- `11-finalize.md` 확인 및 결과 보고서 작성 완료. 현재 브랜치에는 기존 미커밋 변경이 있으므로 커밋·병합·Push를 수행하지 않았다.
