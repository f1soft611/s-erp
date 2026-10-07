# F1-Grid 사용자 선택 필드 라벨 수직 정렬 결과

## 현상과 원인

사용자 선택 필드의 비축소 라벨이 입력 중앙보다 위에 표시됐다. `UserSelectEditor`는 작은 글꼴(0.82rem)을 적용했지만 MUI small outlined 입력의 기본 라벨 transform(`translate(14px, 9px)`)을 유지해 실제 폰트 높이와 수직 오프셋이 맞지 않았다.

## 변경

- 비축소 outlined 라벨에만 `translate(14px, 11px)`를 적용했다.
- 축소 라벨, compact Grid cell 편집, 필드 높이 및 선택 동작은 변경하지 않았다.
- 회귀 테스트와 F1-Grid 문서를 갱신했다.

## 검증

- RED 확인: 보정 전 회귀 테스트에서 `translate(14px, 9px)`가 예상 보정값과 달라 실패했다.
- `npm run test -- tests/user-select-editor.test.tsx tests/document-write-page.test.tsx`: 2개 파일, 26개 테스트 통과.
- `npm run lint -- src/shared/components/f1-grid/editing/UserSelectEditor.tsx tests/user-select-editor.test.tsx`: 통과.
- `npm run build`: TypeScript 검사 및 Vite 빌드 통과.
- 브라우저 375px/768px/1280px에서 결재선 및 참조 라벨의 중심과 입력 필드 중심 차이를 측정했다. 각각 최대 0.4px 및 1.4px로 중앙 정렬을 확인했다.
- 브라우저 캡처: [user-select-label-alignment.png](./screenshots/user-select-label-alignment.png)
