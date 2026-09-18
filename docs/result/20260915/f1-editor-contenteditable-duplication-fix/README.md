# 20260915_002 F1Editor contentEditable 중복 입력/색상 회귀 수정

## 작업 경로

- 구현: [../../../frontend/src/shared/components/f1-editor/F1Editor.tsx](../../../frontend/src/shared/components/f1-editor/F1Editor.tsx)
- 회귀 테스트: [../../../frontend/tests/f1-editor.test.tsx](../../../frontend/tests/f1-editor.test.tsx)

## 작업 상태

- 범주: bounded
- 상태: 완료
- 승인 상태: 회귀 테스트 기준으로 구현 반영

## 요구사항 반영

- 제목과 본문은 `contentEditable` 입력 중에도 텍스트가 중복으로 덧붙이지 않도록 정규화한다.
- 제목은 줄바꿈을 공백으로 정리해 한 줄 입력으로 유지한다.
- 실제 입력 시 텍스트는 연한 placeholder 색으로 보이지 않도록 정상 본문 색을 유지한다.
- 제목/본문 스타일은 공지사항 피드와 동일한 굵기와 폰트 크기로 일관되게 유지한다.

## 구현 내용

- 입력 이벤트에서 `textContent`를 정규화하고, 반복 문자열이 붙는 케이스를 `normalizeRepeatedText`로 제거했다.
- 제목과 본문 렌더링을 `contentEditable` 내부의 루트 텍스트 문자열로 고정해 React가 같은 텍스트를 다시 주입하지 않도록 수정했다.
- 선택 영역과 툴바 강조 기능은 루트 노드의 `data-f1-text-node-id`를 유지해 기존 마크 토글 동작을 그대로 유지했다.
- 텍스트 입력 색과 placeholder 색이 혼재되지 않도록 기본 텍스트 색을 `text.primary`로 유지했다.

## 검증 명령

```bash
cd frontend
npm run test -- tests/f1-editor.test.tsx
npm run build
```

## 검증 결과

- 단위 테스트: 9/9 통과 (`npm run test -- tests/f1-editor.test.tsx`)
- Vite 프로덕션 빌드: 성공 (`npm run build`)

## 원인 요약

- `contentEditable` 루트에 자식 텍스트 노드를 다시 렌더링하면서 동일 문자열이 재주입되며 중복이 발생했다.
- 입력 중 값 비교 전에 반복 문자열 정규화를 수행하지 않아 타이핑 시 이전 문자열이 누적되었다.
- 실제 입력 텍스트를 placeholder 색으로 렌더링하는 경로가 남아 있어, 사용자가 입력 중에도 연한 회색이 유지되었다.
