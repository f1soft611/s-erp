# F1-Grid 선택 에디터 외부 클릭 종료 결과

## 근거와 범위

- [작업지시서](../../../directions/20261027/20261027_004_f1grid-picker-dismiss_작업지시서.md)
- [계획서](../../../plan/20261027/20261027_004_f1grid-picker-dismiss_계획서.md)
- [상세 사양서](../../../spec/20261027/20261027_004_f1grid-picker-dismiss_상세사양서.md)
- 공통 F1-Grid의 code/select 편집 종료만 수정했다. 백엔드/API/DB/스키마 변경과 업무 데이터 저장은 없다.

## 재현과 원인

1. 공통코드 select 셀을 편집하고 목록을 연 뒤 선택 없이 다른 곳을 클릭하거나 Escape를 누른다.
2. MUI 목록은 닫히지만 셀의 combobox는 남는다. Grid의 외부 클릭 처리는 옵션 선택을 보호하기 위해 popup 클릭을 건너뛰며, SelectEditor는 목록 닫기를 Grid에 전달하지 않았다.
3. 숫자 코드 `101`의 code 버튼 편집을 열고 다른 셀/그리드 밖을 클릭하면 종료는 되지만 일반 확정 로직이 `'101'` 문자열을 저장해 불필요한 updated 행을 만들었다.
4. 수정 전 회귀 테스트에서 select 목록 닫기 2건과 code 원본 타입 보존 2건이 실제 실패했다.

## 수정

- SelectEditor의 미선택 목록 닫기를 기존 `onStopEdit`에 연결해 값 변경 없이 편집을 종료한다.
- 실제 옵션 선택은 기존 `onChange` 저장/종료를 유지한다. ref로 선택 확정 여부를 구분해 뒤따르는 목록 닫기에서 `endEdit`가 두 번 호출되지 않게 했다. 중복 종료는 별도 실패 테스트로 확인한 뒤 수정했다.
- code 컬럼은 일반 텍스트 draft 확정에서 제외한다. 코드 값 변경은 기존 picker 패치 경로로만 수행한다.
- 미선택 종료는 값/타입/dirty를 유지하고, 정상 선택의 숫자 옵션 값 및 코드·명칭 패치를 보존한다.
- `F1-GRID.md`에 사용자 동작을 함께 반영했다.

## 검증

| 항목 | 결과 |
|---|---|
| 새 회귀 7건과 인접 편집 테스트 | 최종 14건 통과 |
| 편집 입력·행 폼·렌더 성능 관련 3개 테스트 파일 | 75건 통과 |
| TypeScript/Vite `npm run build` | 최종 통과 |
| 변경 파일 oxlint | 오류 0건, 기존 React/ref/hooks 경고는 유지 |
| 실제 Chromium, 375/768/1280px | 미선택 외부/다른 셀 클릭, 목록 Escape 종료, 정상 select/code 선택 통과 |
| 브라우저 페이지 가로 넘침/런타임 오류 | 없음 |

해당 Grid 테스트 파일 전체는 **완전 통과하지 않았다**. 제품 코드 수정 전에는 118통과/51실패였으며 이 중 4건은 이번에 추가한 실패 회귀였다. 최종 전체 실행은 123통과/46실패로 새 회귀는 모두 통과했다. 기존 실패는 깨진 한글 기대 문자열, 기존 기본 편집/레이아웃/병합 기대값 불일치 등이었고 수정 범위를 넓히지 않았다. 수정 전의 가상화 테스트 timeout 1건은 최종 실행에서 발생하지 않았다.

최종 집중 실행 명령(`frontend`):

```powershell
& .\node_modules\.bin\vitest.cmd run tests\f1-grid.test.tsx -t 'unselected|menu closes|selected numeric code|select icon rendering|fills the code picker|commits and exits edit mode|does not create an updated row|user column' --reporter=dot
npm run build
```

기존 `http://127.0.0.1:4173` S-ERP 서버를 재사용했다. 브라우저 검증은 인증이나 업무 화면 없이 실제 Grid 모듈과 합성 행으로 수행했고 브라우저는 종료했다. 기존 서버는 종료하지 않았다.

## 스크린샷

| 뷰포트 | 선택 목록 | 미선택 편집 종료 |
|---|---|---|
| 375px | [열림](screenshots/375-select-open.png) | [종료](screenshots/375-dismissed.png) |
| 768px | [열림](screenshots/768-select-open.png) | [종료](screenshots/768-dismissed.png) |
| 1280px | [열림](screenshots/1280-select-open.png) | [종료](screenshots/1280-dismissed.png) |

좁은 화면은 Grid 내부 가로 스크롤을 유지한다. 캡처에는 합성 데이터만 포함한다.
