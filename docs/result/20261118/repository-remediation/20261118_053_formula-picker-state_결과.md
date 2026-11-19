# 배합비 원료 picker 대상 상태 결과

## 범위

[작업지시서](../../../directions/20261118/20261118_053_formula-picker-state_작업지시서.md) → [계획서](../../../plan/20261118/20261118_053_formula-picker-state_계획서.md) → [상세사양](../../../spec/20261118/20261118_053_formula-picker-state_상세사양서.md)를 따랐다.

WorkStandardFormulaTab의 대상 ref 2개/열림 boolean을 nullable 대상 상태 1개로 합쳤다. 셀 경로는 기존 applyPatch, toolbar 경로는 기존 선택 rowId를 보관한다. 열림은 대상 유무에서 파생하고 닫기에서 null로 정리한다. 함수는 객체 안에 보관해 state updater로 실행하지 않는다.

column factory는 원래도 callback을 즉시 실행하지 않으므로 이번 진단을 런타임 장애의 증거로 해석하지 않는다. ref 없는 open callback으로 상태 소유권을 명확히 한 구조 정리다. gridRef의 실제 이벤트 접근·setCellValue·patch converter·계산식·컬럼·그 외 JSX/CSS·서비스/API/DB/의존성은 유지했고 effect를 추가하지 않았다. F1Grid 공통 코드는 변경하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기존 기준선 | 작업표준서 페이지 1파일·5개 통과 |
| 보존 회귀 | 실제 FormulaTab/F1Grid/MaterialPickerDialog, search service만 합성 응답; **수정 전/후 같은 2파일·8개 통과** |
| 실제 lint RED | 대상 ref 진단 0 assertion이 기존 1건으로 실패 |
| 정적 검증 | typecheck/build exit 0, 기존 chunk 경고 유지 |
| 전체 lint | **89→88**, 제거 1/새 진단 0 |
| 범위/byte 대조 | 대상 저장/열림 조건 외 운영 코드 동일, 새 회귀 포함 frontend 891파일 byte 차이 0 |

회귀는 셀 picker 필드 채움/수량·합계 보존, 취소 뒤 다른 행 toolbar 선택, disabled 중 대상 숨김/해제 후 동일 대상 복원을 검증한다. 기존 구현에서도 통과한 보존 회귀이며 runtime RED라고 주장하지 않는다.

[범위 근거](screenshots/formula-picker-state/scope-audit.json) · [브라우저 근거](screenshots/formula-picker-state/verification.json)

## 실제 브라우저

공유 4173의 소유 탭에서 실제 컴포넌트와 그리드·공통 품목 선택창을 구동했다. 품목 목록 fetch만 로컬 합성 응답을 반환하고 나머지 요청은 차단했다. 저장소는 탭 한정 메모리이며 실제 인증/계정/테넌트 데이터를 읽거나 요청하지 않았다.

375/768/1280px 각각 다음을 확인했다.

- 셀 picker 열기/취소는 행을 변경하지 않는다. 이후 toolbar 선택은 둘째 행만 갱신한다.
- 다시 첫 행 셀 picker를 열고 부모 disabled/해제를 적용해도 대상이 유지된다. 실제 선택 후 첫 행을 갱신하며 이전 대상이 남지 않는다.
- disabled는 원료 추가/선택 버튼과 picker 노출을 차단한다. 부모 prop 전환은 fixture 상태로 재현했으며 modal 뒤 버튼을 native 클릭했다고 주장하지 않는다.
- 기준 생산량 합계 **30.000**, 1판 기준 **0.750**와 두 행 수량을 보존한다. 합성 검색 6회, 알 수 없는 요청/문서 가로 넘침 0.

375px는 기존 모바일 행 폼 안의 원료코드 선택·폼 적용/취소 경로, 768/1280px는 기존 inline 코드 editor 경로다. 처음 fixture가 모든 폭을 inline/aria-label 버튼으로 가정해 멈췄으나 실제 DOM의 기존 모바일 폼과 text-only 버튼을 확인해 **검증기만** 수정했다. 새 탭에서 전체 3폭 시나리오를 다시 통과했고 이를 위해 제품 편집 모드·공통 그리드·선택창을 바꾸지 않았다.

| 폭 | 이미지 |
| --- | --- |
| 375 | [기존 모바일 품목 선택창](screenshots/formula-picker-state/dialog-375.png) · [행별 반영](screenshots/formula-picker-state/selected-375.png) |
| 768 | [품목 선택창](screenshots/formula-picker-state/dialog-768.png) · [행별 반영](screenshots/formula-picker-state/selected-768.png) |
| 1280 | [품목 선택창](screenshots/formula-picker-state/dialog-1280.png) · [행별 반영](screenshots/formula-picker-state/selected-1280.png) |

## CI와 잔여

[052의 정확한 SHA CI](20261118_052_comment-submit-ref_결과.md) **226파일·2,682개**와 tests/build/lint/required 네 job success를 원본 집계로 확인했다. 완료 뒤에만 이번 단위를 별도 커밋·비강제 푸시한다. 이번 053의 정확한 SHA 전체 CI는 별도로 확인하며 선행 결과를 재사용하지 않는다.

053은 `7b38be1ba748a8555d2b49d02767e92a28882dbc`로 별도 커밋·비강제 푸시했고 원격 SHA 일치를 확인했다. [정확한 SHA CI 44348087515](https://github.com/f1soft611/s-erp/actions/runs/44348087515)의 원본 마지막 집계는 **227파일·2,685개 통과**이며 tests/build/lint/required 네 job 모두 success다. [CI 근거](screenshots/formula-picker-state/remote-ci.json)는 다음 054 단위에 함께 기록한다.

최초 206개 중 118개를 제거했고 **88개 경고는 순차 처리 중**이다(state-in-effect 82/ref 6/exhaustive-deps 0). 공식 호환 경로 없는 권고 2건은 [027](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED를 유지한다. 기존 TreeProjection 3단계 및 자료실 모바일 관찰은 이 단위에서 수정하지 않았다.

```text
refactor(frontend): 배합비 원료 선택 대상 상태 통합

- 셀 patch와 선택 행 대상을 nullable 상태로 관리
- 실제 그리드/선택창의 취소·다른 행·disabled 복원 보존 회귀 추가
- 관련 8개·실제 3폭 검증, lint 89→88
```
