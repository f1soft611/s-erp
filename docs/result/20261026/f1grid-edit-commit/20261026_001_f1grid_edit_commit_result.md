# F1-Grid 편집 확정 렌더 격리 결과

## 근거 및 범위

- [작업지시서](../../../directions/20261026/20261026_001_f1grid_edit_commit_작업지시서.md)
- [계획서](../../../plan/20261026/20261026_001_f1grid_edit_commit_계획서.md)
- [상세사양서](../../../spec/20261026/20261026_001_f1grid_edit_commit_상세사양서.md)
- [F1-Grid 사용자 문서](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)

셀 편집 후 끊김 보고를 조사한 뒤 사용자의 개선 승인을 받아 일반 행의 편집 확정 렌더를 격리했다. 공용 GridRow comparator만 변경했으며 공개 옵션/화면 기능/백엔드/API/DB/스키마 변경은 없다. 업무 데이터 편집·저장 요청은 수행하지 않았다.

## 재현, 원인 및 해결

1. 합성 100행 × 2열에서 첫 행을 편집하고 Enter/Tab/다른 셀 클릭으로 확정한다.
2. 전체 dirty 맵, 병합 정보 배열 및 visibleRows 참조가 바뀌어 비수정 99행도 memo 비교에 실패한다.
3. 셀 memo는 다른 행의 표시 renderer를 막지만 행 본문의 셀 속성 계산, cellAdornment 호출 등은 반복된다.
4. dirty는 현재 행의 컬럼별 boolean으로 비교한다. 일반 행은 전체 목록 참조 대신 길이를 비교하고 기존 row/rowIndex/renderIndex 비교를 유지한다.
5. 병합 열이 하나라도 있으면 전체 목록과 병합 정보 참조 비교를 유지한다. 다른 행의 병합 값 변경으로 영향을 받는 그룹 시작 행을 생략하지 않는다.
6. 기존 latestProps 기반 이벤트 전달 구조를 유지해 렌더를 생략한 행도 최신 편집 콜백을 실행한다.

행 개수가 바뀌는 작업은 보수적으로 행 본문을 갱신한다. 병합 그리드 전체 렌더 최적화는 이번 범위가 아니다.

## 브라우저 전후 측정

기존 `http://127.0.0.1:4173` 개발 서버에서 합성 그리드를 임시로 구성했다. 동일 조건: 100행, 2열, 첫 열 왼쪽 고정, 체크박스 없음, 행 가상화 끔, 열 가상화 켬, null을 반환하는 cellAdornment로 행 본문 방문 계수, React Profiler actualDuration 기록.

| 편집 확정 지표 | 수정 전 | 수정 후 |
| --- | --- | --- |
| 비수정 행 본문 실행 | 99행 | 0행 |
| 비수정 행 cellAdornment 호출 | 198회 | 0회 |
| 전체 cellAdornment 호출 | 200회 | 2회 |
| 비수정 행 표시 renderer 호출 | 0회 | 0회 |
| React 렌더 시간 5회 | 96.3 / 93.4 / 86.4 / 77.7 / 58.7ms | 22.9 / 24.1 / 25.7 / 22.3 / 19.9ms |
| React 렌더 시간 평균 | 82.5ms | 약 23.0ms |

- 첫 행을 더블클릭 → 값을 변경 → 두 번의 requestAnimationFrame으로 안정화 → 카운터 초기화 → Enter → 두 프레임 안정화 후 읽기를 반복했다.
- 임시 createRoot는 앱의 HMR 연결 경로와 다르므로 수정 후 브라우저를 새로고침하고 최신 모듈로 합성 그리드를 재구성한 결과를 사용했다. 새로고침 전 캐시된 모듈 측정은 수정 후 결과에서 제외했다.
- 개발 빌드, 합성 데이터, 제한된 열 구성의 측정이다. 실제 품목/거래처 화면 및 운영 빌드의 지연 감소율이나 API/DB 응답시간을 보장하지 않는다.
- 이번 변경으로 부모 그리드의 모든 목록 계산이나 React wrapper 실행까지 없어지는 것은 아니다. 결정적 회귀 기준은 무관한 행 본문 및 표시 renderer 호출 0회다.

## 회귀 검증

- RED: 새 Enter/Tab/클릭 확정 테스트 3개가 비수정 행 방문 198회로 실패하는 것을 코드 수정 전에 확인했다.
- GREEN: 아래 집중 묶음 **4개 파일, 70개 테스트 통과**.

```powershell
Set-Location frontend
npm run test -- tests\f1-grid-render-performance.test.tsx tests\f1-grid-row-merge-regression.test.tsx tests\f1-grid-pinned-column-range.test.tsx tests\f1-grid-form-modal.test.tsx
npm run build
npm run lint -- src\shared\components\f1-grid\core\GridRow.tsx tests\f1-grid-render-performance.test.tsx tests\f1-grid-row-merge-regression.test.tsx
```

- 성능 16개: 확정 경로 3종, dirty 복구, 다른 행의 최신 편집 콜백, 행 추가 마지막 경계, 정렬 후 행 번호, 편집으로 필터 제외된 후 마지막 경계 및 기존 선택/입력 회귀.
- 병합 6개: 나중 행의 값을 편집해 병합 그룹을 분리했을 때 수정되지 않은 시작 셀의 span 갱신 검증 포함.
- 고정열 범위 1개, 행 폼 47개 통과.
- 폼 테스트는 기존 select 옵션 범위 경고를 출력하지만 테스트 실패는 없다.
- TypeScript + Vite 빌드 통과. 1,000KB 초과 청크 경고가 남아 있다.
- 변경 파일 한정 oxlint 종료 코드 0. 수정하지 않은 기존 함수 export/렌더 중 ref/Hook 의존성 영역 경고 7개가 남아 있다.
- VS Code 변경 코드 파일 진단 오류 없음. 전체 테스트 스위트는 실행하지 않았다.
- 직접 diff 검토에서 병합 전역 의존, 일반 행 마지막 경계, dirty boolean 및 최신 이벤트 전달을 확인했다.

## 화면 크기별 검증

합성 그리드에서 각 크기별 첫 행 Code 편집 → Tab 확정 → 에디터 종료 및 표시 반영 확인:

| viewport | document scrollWidth | grid width |
| --- | --- | --- |
| 375px | 360px | 360px |
| 768px | 753px | 753px |
| 1280px | 1265px | 1265px |

페이지 전체 가로 넘침 없음. 너비 차이 15px는 브라우저 세로 스크롤 영역이다. 그리드 내부 세로 스크롤, 고정열, 편집 확정값과 dirty 표시를 확인했다. 레이아웃 정책은 변경하지 않았다.

- [375px](screenshots/synthetic-grid-375.png)
- [768px](screenshots/synthetic-grid-768.png)
- [1280px](screenshots/synthetic-grid-1280.png)

## 종료 점검

- 작업지시서 → 계획서 → 상세 사양서 → 실패 테스트 → 구현 → 회귀/브라우저 검증 순서로 진행했다.
- 결과 문서, 사용자 문서 및 합성 스크린샷을 함께 남겼다.
- 기존 개발 서버를 재사용했고 임의로 종료하지 않았다.
- 신규 서버나 패키지를 설치하지 않았다. DB 변경이 없어 SQL/DB MCP 확인은 대상이 아니다.
