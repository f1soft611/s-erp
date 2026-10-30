# 단가등록 품목·거래처 도움창 목록 혼용 수정 결과

## 재현과 원인

- 품목 검색/선택 또는 닫기 후 거래처 도움창을 열면 이전 품목 검색어/목록이 표시됐다. 오류 메시지도 그대로 남았다.
- 단가 화면에서 같은 `MasterPickerDialog`에 label/search props만 교체하여 내부 state를 재사용한 것이 원인이다.
- 변경 전 추가한 회귀 테스트 3개가 이전 검색어/오류 잔존으로 실패하는 것을 확인했다.

## 해결

- `ItemPartnerPriceGrid`의 도움창에 종류/닫힘 상태 기반 key를 지정했다.
- 품목/거래처/닫힘 전환 시 검색 상태는 초기화하고 행 폼의 선택값은 보존한다.
- 공통 도움창, API/DB, 권한, 저장, 레이아웃/CSS는 변경하지 않았다.

## 검증

- 단가 페이지/서비스/엑셀/업로드 및 공통 도움창 Vitest: 5개 파일, 21개 테스트 통과.
- 새 회귀 사례: 양방향 선택 및 같은 종류 재열기, 닫힌 품목 검색의 늦은 응답, 이전 오류 초기화.
- `npm run build`: 통과.
- 수정 TS/TSX 파일 oxlint: 통과.
- 전체 `npm run lint`: 기존 `tests/common-code-management-page.test.tsx:53`의 조건부 `useImperativeHandle` 오류로 실패. 이번 수정 파일과 무관하며 범위 밖 코드는 변경하지 않았다.
- `node --test tests\item-partner-price-picker.browser.mjs`: 375/768/1280px 모두 통과. 실제 단가 그리드/행 폼을 렌더링하고 검색 서비스만 합성 응답으로 대체했다.
- 브라우저에서 품목 검색/선택 → 빈 거래처 도움창 → 거래처 검색/선택 → 빈 품목 도움창을 확인했다. 거래처 도움창 경계/페이지 가로 넘침과 런타임 오류도 검사했다.
- 브라우저 전용 셸의 border-box를 실제 앱과 맞춘 후 검증했다. 기존 4173 S-ERP 서버를 재사용했으며 종료하지 않았다.

## 스크린샷

| 너비 | 거래처 결과만 표시 | 폼 선택값 보존 |
|---|---|---|
| 375px | [도움창](screenshots/customer-picker-375.png) | [선택값](screenshots/selected-masters-375.png) |
| 768px | [도움창](screenshots/customer-picker-768.png) | [선택값](screenshots/selected-masters-768.png) |
| 1280px | [도움창](screenshots/customer-picker-1280.png) | [선택값](screenshots/selected-masters-1280.png) |

## 체크리스트

- 작업지시서 → 계획서 → 상세사양서 → 테스트/구현 → 결과/스크린샷 순서로 진행했다.
- F1-Grid 사용 문서를 함께 갱신했다.
- DB/API 계약 변경이 없어 DB MCP 및 SQL/스키마 변경 대상이 아니다.
- 기존 전자결재 현황 변경사항은 보존했다.
