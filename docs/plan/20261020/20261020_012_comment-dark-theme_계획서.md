# 댓글 다크 테마 수정 계획서

**목표:** 문서·공지의 공통 댓글이 현재 앱 테마를 기본값으로 사용한다.

**근거:** [작업지시서](../../directions/20261020/20261020_012_comment-dark-theme_작업지시서.md).

## 원인 및 범위

문서 `DocumentApprovalDetailFeed`는 댓글에 `isDark`를 생략한다. 공통 `TiptapCommentThread`의 기본값 `false` 때문에 MUI 텍스트는 다크인데 첨부 카드·아바타·입력창은 라이트로 렌더링된다. 공지는 이미 명시적인 값을 전달한다.

## 실행

1. `frontend/tests/feed-components.test.tsx`에 앱 테마만 전달하는 댓글·답글·첨부·수정창 테스트를 추가한다. 라이트 및 명시적 `isDark` 호환성을 확인한다.
2. 해당 테스트를 실행해 기존 다크 배경의 실패를 확인한다.
3. `frontend/src/shared/components/feed/TiptapCommentThread.tsx`에서 `useTheme`를 사용한다.

   ```ts
   isDark: isDarkProp,
   // 함수 본문
   const theme = useTheme();
   const isDark = isDarkProp ?? theme.palette.mode === 'dark';
   ```

   결정된 값은 기존 `props`와 `CommentEditor` 전달 경로를 재사용한다.
4. 기존 합성 브라우저 fixture에서 명시적 테마 전달을 생략하고 댓글 입력·답글·첨부를 노출한다.
5. 관련 feed/문서/공지 테스트와 `npm run build`를 실행한다.
6. 기존 4173 서버를 재사용해 라이트/다크, 375/768/1280px overflow와 실제 배경색을 확인한다.
7. 결과 및 스크린샷을 `docs/result/20261020/comment-dark-theme`에 기록한다.

기존 작업 트리의 변경은 보존하며 커밋은 수행하지 않는다.
