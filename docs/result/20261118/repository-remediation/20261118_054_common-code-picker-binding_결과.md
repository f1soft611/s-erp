# 공통코드 상위 picker 이벤트 바인딩 결과

## 범위

[작업지시서](../../../directions/20261118/20261118_054_common-code-picker-binding_작업지시서.md) → [계획서](../../../plan/20261118/20261118_054_common-code-picker-binding_계획서.md) → [상세사양](../../../spec/20261118/20261118_054_common-code-picker-binding_상세사양서.md)를 따랐다.

비공개 itemColumns는 활성 boolean으로 메타데이터만 만들고 parentItemNm의 기존 picker callback은 컴포넌트의 명시적 컬럼 조립에서 지연 바인딩한다. 반환값 undefined와 저장 중 editable=false 적용 순서를 유지했다. F1GridColumn의 기존 contextual type을 명시했으며 광범위한 형 변환은 추가하지 않았다.

기존 factory도 callback을 즉시 실행하지 않으므로 런타임 장애를 고쳤다고 주장하지 않는다. async 조회·ref 소비자·저장 전후 guard·오류·행 제외·삭제 정책·JSX/CSS·서비스/API/DB/의존성은 변경하지 않았다. 이 파일의 별도 render 삭제 guard ref 경고 1건은 남겨 두었다. F1Grid/F1Tree 공통 소스도 변경하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선 | 공통코드 UI/service/session 3파일·42개 통과 |
| 보존 회귀 | 실제 Panel/tree/grid에서 취소·재열기·다른 상위 선택; 수정 전 집중 1개 통과 |
| 실제 lint RED | factory 전달 ref 진단 0 assertion이 기존 1건으로 실패 |
| 수정 후 | 관련 3파일·43개, typecheck/build exit 0 |
| 전체 lint | **88→87**, 제거 1/새 진단 0 |
| 범위/byte 대조 | 두 컬럼 구성 영역 외 운영 코드·기존 테스트 동일, frontend 891파일 byte 차이 0 |

기존 저장 중 잠금/quiet refresh/변경 보존 회귀를 포함한 같은 3파일을 실행했다. 기존 chunk 경고는 유지한다.

[범위 근거](screenshots/common-code-picker-binding/scope-audit.json) · [브라우저 근거](screenshots/common-code-picker-binding/verification.json)

## 실제 브라우저와 제한

공유 4173의 소유 탭에서 실제 Panel/F1Tree/F1Grid/CommonDialog를 사용했다. 기존 그룹 1/2 항목 GET만 합성 응답 22회로 제한하고 나머지 요청은 차단했다. 저장소는 탭 한정 메모리로 대체했으며 실제 인증/계정/테넌트 데이터를 읽거나 요청하지 않았다. 알 수 없는 요청/예상 밖 오류/문서 가로 넘침은 모두 0이다.

375/768/1280px 모두 picker 열기·취소 후 원래 행 보존, 재열기·다른 상위 이름 반영, saving prop 중 편집 차단과 해제 후 재열기, 상위 그룹 없는 경우 picker 비활성화를 확인했다. 375px는 기존 모바일 행 폼의 선택·적용/취소, 768/1280px는 기존 inline 코드 editor다.

태블릿의 좁은 상세 pane에서는 중앙 클릭 지점이 고정 순번 셀에 가려져 최초 검증기가 중단됐다. 기존 분리기를 native drag하고, 필요한 경우 elementFromPoint로 실제 노출된 target 부분임을 확인한 좌표에서 native mouse down/up을 사용했다. 강제 클릭/DOM click, 제품 기본 폭·공통 그리드 변경으로 우회하지 않았다. 새 탭에서 전체 3폭 시나리오를 다시 실행한 결과와 PNG 6개만 최종 근거로 보관한다. 최종 상세 pane 폭은 343/326/738px이며 그리드 내부 가로 스크롤은 유지한다.

saving prop만 바꾸는 합성 부모는 실제 saveInFlightRef가 없어 기존 idle 재조회를 유발할 수 있다. 그 시점의 실제 표시 행으로 편집 제한을 확인했으며, 이를 실제 저장 중 초안 보존과 동일하다고 주장하지 않는다. 실제 deferred-save 계약은 기존 관련 단위 회귀와 변경되지 않은 guard로 확인했다.

| 폭 | 이미지 |
| --- | --- |
| 375 | [기존 모바일 상위 선택창](screenshots/common-code-picker-binding/picker-375.png) · [상위 이름 반영](screenshots/common-code-picker-binding/selected-375.png) |
| 768 | [상위 선택창](screenshots/common-code-picker-binding/picker-768.png) · [상위 이름 반영](screenshots/common-code-picker-binding/selected-768.png) |
| 1280 | [상위 선택창](screenshots/common-code-picker-binding/picker-1280.png) · [상위 이름 반영](screenshots/common-code-picker-binding/selected-1280.png) |

## CI와 잔여

[053 정확한 SHA CI](20261118_053_formula-picker-state_결과.md) **227파일·2,685개**, tests/build/lint/required 네 job success를 확인했다. 그 완료 뒤에만 이번 단위를 별도 커밋·비강제 푸시한다. 054의 정확한 SHA 전체 CI는 별도로 확인하며 선행 결과를 재사용하지 않는다.

최초 206개 중 119개를 제거했고 **87개 경고는 순차 처리 중**이다(state-in-effect 82/ref 5/exhaustive-deps 0). 공식 호환 경로 없는 권고 2건은 [027](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED를 유지한다. 기존 TreeProjection 3단계와 자료실 모바일 관찰은 이 단위에서 수정하지 않았다.

```text
refactor(frontend): 공통코드 상위 선택 이벤트 바인딩 분리

- boolean 컬럼 구성과 지연 picker 이벤트 결합을 분리
- 기존 저장/ref guard와 취소·재열기·선택 보존
- 관련 43개·실제 3폭 검증, lint 88→87
```
