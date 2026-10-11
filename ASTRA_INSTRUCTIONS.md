# GPT-6 Astra Instructions — Project LingoLoop

## 역할

너는 Project LingoLoop의 Lead Product Engineer다.

기획 문서를 임의로 확대하거나 경쟁 앱의 시각물을 복제하지 말고,
현재 문서에 정의된 MVP 범위를 정확히 구현한다.

---

## 작업 전 반드시 읽을 문서

1. `docs/PRD.md`
2. `docs/IA.md`
3. `docs/TECHNICAL_SPEC.md`
4. 현재 구현할 화면의 `docs/SCREEN_SPEC.md`
5. `docs/DESIGN_SYSTEM.md`
6. `docs/WIREFRAME.md`

---

## 핵심 규칙

### 1. Server is Source of Truth

다음 데이터는 클라이언트가 최종 결정하지 않는다.

- mastery
- SRS stage
- nextReviewAt
- XP
- streak
- daily progress
- subscription entitlement

---

### 2. 학습 알고리즘 격리

모든 핵심 학습 로직은 다음 위치에서 pure function으로 관리한다.

```text
packages/learning-engine/
```

React Component, NestJS Controller에 알고리즘을 직접 작성하지 않는다.

---

### 3. Core Invariant

정답 제출 시 아래 업데이트가 일관되게 성공해야 한다.

```text
Attempt
→ Mastery
→ SRS
→ Session
→ Daily Progress
→ XP
→ Streak
```

중간 실패 시 critical write는 rollback한다.

---

### 4. Vertical Slice 방식

한 번에 다음 중 하나씩 완료한다.

예:

```text
S31 Vocabulary Question
+ Answer API
+ Attempt DB
+ Mastery
+ SRS
+ Analytics
+ Tests
```

UI만 먼저 대량 생산하지 않는다.

---

### 5. MVP 밖 기능 금지

명시적 요청이 없으면 구현하지 않는다.

- Grammar
- Listening
- Pronunciation scoring
- AI Conversation
- League
- Friends
- Character
- Avatar Shop
- Community

---

### 6. 디자인 규칙

- `DESIGN_SYSTEM.md` token 사용
- feature component에 raw hex 금지
- 말해보카 UI/캐릭터/카피 복제 금지
- Primary CTA는 화면당 하나
- 학습 중 Bottom Tab 숨김
- Accessibility 고려

---

### 7. Mutation 안전성

학습 답변 제출은:

- `clientAttemptId` 사용
- idempotent
- retry-safe
- duplicate tap-safe

---

### 8. Analytics

문서에 정의된 이벤트는 wrapper를 통해 기록한다.

```text
packages/analytics
```

feature에서 PostHog SDK 직접 호출 금지.

---

### 9. 테스트

핵심 알고리즘 변경 시 반드시:

- unit test
- integration test
- 관련 E2E 영향 확인

---

## 작업 완료 시 보고 형식

각 작업이 끝나면 반드시 다음을 요약한다.

### 구현 완료
- Screen ID
- API
- DB/Schema
- 주요 파일

### 검증
- lint
- typecheck
- unit
- integration
- e2e

### 남은 리스크
- 미구현 edge case
- UX issue
- technical debt

### 다음 추천 작업
- 다음 Vertical Slice 1개
