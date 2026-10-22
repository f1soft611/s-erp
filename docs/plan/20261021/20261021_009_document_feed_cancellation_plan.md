# 문서 피드 취소 액션 구현 계획

**Goal:** 피드에서도 상세와 동일한 취소 조건/확인/처리 흐름을 제공한다.

**Architecture:** 기존 DocumentApprovalDetailFeed 공용 도구막대의 취소 버튼에서 피드 제외 조건만 제거한다. 권한 계산 및 액션 핸들러는 그대로 재사용한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Vite.

1. 페이지 테스트에 피드 상신/승인 취소 확인, 확인창 닫기, 오류 재시도, 성공 후 갱신 및 불허 조건을 추가한다.
2. 변경 전 버튼 부재로 실패함을 확인한다.
3. `DocumentApprovalDetailFeed.tsx`의 `!isFeedPresentation && canCancelSubmission` 및 `!isFeedPresentation && canCancelApproval`에서 화면 제한만 제거한다.
4. 대상 테스트와 리스트 두 배지/기존 상세 취소 회귀, 빌드를 실행한다.
5. 합성 응답 브라우저에서 취소 버튼/확인창을 확인하고 결과/스크린샷을 기록한다. 실제 문서 취소는 수행하지 않는다.
