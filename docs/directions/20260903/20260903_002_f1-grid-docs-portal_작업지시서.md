# F1-Grid 개발자 문서 포털 작업지시서

## 배경

현재 F1-Grid는 S-ERP 관리자 화면의 테스트 페이지와 `frontend/src/pages/f1-grid-docs/F1-GRID.md`로 분산되어 있다. 개발자가 기능을 찾고 문서를 읽은 뒤 실제 Grid 동작을 확인하려면 여러 위치를 오가야 한다.

## 목표

F1-Grid 기능 문서와 실행 가능한 예제를 하나의 공개 문서 포털로 제공하고, S-ERP 내부 메뉴에서도 같은 문서 화면에 접근할 수 있게 한다.

## 확정 요구사항

- 독립 URL `/f1-grid-docs`를 로그인 없이 제공한다.
- S-ERP 내부 메뉴에서 F1-Grid 문서로 진입할 수 있게 한다.
- 고정 왼쪽 사이드바와 넓은 문서 본문을 사용한다.
- 기능 카탈로그, TypeScript API 레퍼런스, 실행 예제, 코드 복사를 제공한다.
- 문서별 Playground는 옵션 패널 방식으로 동작하며 샘플 데이터만 사용한다.
- 첫 버전은 임의 코드 실행이나 외부 API 연동을 포함하지 않는다.
- 모바일, 태블릿, 데스크톱 레이아웃을 지원한다.

## 문서 범위

- Overview
- Getting Started
- Core Grid
- Editing
- Selection & Clipboard
- Filtering & Sorting
- Column Layout
- Row Height
- Row Merge
- Tree Grid
- API Reference
- Testing Guide

## 제외 범위

- 백엔드 API 및 DB 변경
- 운영 데이터 조회
- 브라우저 내 TypeScript/JSX 임의 실행기
- Monaco/CodeMirror 코드 편집기
- 인증 및 권한 정책 변경

## 완료 기준

- 공개 문서 URL과 내부 메뉴 진입이 모두 동작한다.
- 문서 사이드바에서 문서 전환이 가능하다.
- 문서별 코드와 Playground가 표시된다.
- Playground 옵션 변경이 F1-Grid 결과에 반영된다.
- 코드 복사 동작이 제공된다.
- 기존 F1-Grid 테스트와 신규 문서 포털 테스트가 통과한다.
- 빌드와 반응형 브라우저 검증이 통과한다.
- 결과 문서와 데스크톱/모바일 스크린샷을 작성한다.

