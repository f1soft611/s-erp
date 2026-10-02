# F1-Grid / F1-Tree 저장 키 보완 결과

## 변경 내용

- 실제 렌더링되는 F1Grid/F1Tree 호출부에서 누락된 12개 `storageKey`를 추가했다.
- 기존 키 3개는 유지했다. 설정 그리드, 테스트 화면, 문서 플레이그라운드, 기안양식 및 분류 다이얼로그에는 각각 고유한 용도 키를 지정했다.
- 문서 플레이그라운드의 공용 그리드는 `kind`별 키를 사용해 컬럼 레이아웃이 섞이지 않게 했다.
- 공개 F1-Grid 문서와 API reference 설명에 그리드별 고유 키, 미지정 시 저장되지 않는 동작을 명시했다.
- TypeScript AST를 이용해 향후 호출부 누락과 중복을 검사하는 Vitest를 추가했다.

## 검증

- `npm --prefix frontend run test -- tests/f1-grid-storage-keys.test.ts`: 2개 테스트 통과. 모든 F1Grid/F1Tree JSX 호출부 키 존재 및 중복 없음.
- `npm --prefix frontend run build`: 성공 (TypeScript 및 Vite, 1499 modules transformed).
- 브라우저 `http://127.0.0.1:4173/co/workflow/form`: `co-workflow-draft-form-grid` 키가 localStorage에 생성되는 것을 확인했다.
- 화면 캡처: [screenshots/draft-form-grid-storage-key.png](screenshots/draft-form-grid-storage-key.png)
- `git diff --check`: 오류 없음.

## 범위 참고

문서의 코드 샘플 문자열 및 F1Grid/F1Tree 공용 구현 내부의 위임 렌더링은 화면별 호출 인스턴스가 아니므로 제외했다. 저장 키 지정에 따른 레이아웃 저장 동작만 추가되며 데이터/행 상태 저장은 변경하지 않았다.
