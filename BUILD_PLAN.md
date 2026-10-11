# Build Plan — GPT-6 Astra

## Phase 0 — Bootstrap

### Goal
Monorepo와 개발환경 생성.

### Deliverables

```text
apps/mobile
apps/api
apps/admin
packages/ui
packages/types
packages/config
packages/learning-engine
packages/analytics
```

### Verify
- install
- lint
- typecheck
- dev servers boot

---

## Phase 1 — Database + Auth

Screens:
- S01
- S02
- S03
- S04

Implement:
- Prisma
- PostgreSQL
- User
- UserProfile
- JWT/auth
- Apple/Google 구조
- session restore

---

## Phase 2 — Content Model + Admin Base

Implement:
- Word
- WordMeaning
- Example
- Admin CRUD
- draft/review/published/archive

---

## Phase 3 — Onboarding

Screens:
- S10
- S11
- S12
- S13

Implement:
- learning goals
- self level
- daily goal
- onboarding persistence

---

## Phase 4 — Level Test

Screens:
- S14
- S15

Implement:
- level test session
- adaptive question difficulty
- initial skillLevel

---

## Phase 5 — Core Vocabulary UI

Screens:
- S30
- S31
- S34

Implement:
- daily session
- question rendering
- timer
- hint
- answer input

---

## Phase 6 — Answer Engine

Screens:
- S32
- S33

Implement:

```text
normalize
→ evaluate
→ typo detect
→ Attempt
→ Mastery
```

---

## Phase 7 — SRS

Implement:
- stage
- nextReviewAt
- due review query

---

## Phase 8 — Recommendation

Implement:
- review urgency
- difficulty fit
- weakness
- importance
- novelty
- daily queue

---

## Phase 9 — Completion + Retention

Screens:
- S35
- S21
- S36

Implement:
- XP
- daily progress
- goal complete
- streak
- extra learning

---

## Phase 10 — Home

Screen:
- S20

Implement:
- home summary API
- due reviews
- current level
- daily progress
- streak

---

## Phase 11 — Progress

Screens:
- S40
- S41
- S42

Implement:
- overview
- vocabulary state
- history

---

## Phase 12 — Premium

Screens:
- S50
- S51
- S52
- S64

Implement:
- RevenueCat
- entitlement
- free cap
- restore purchase

---

## Phase 13 — Settings

Screens:
- S60
- S61
- S62
- S63
- S65
- S66

---

## Phase 14 — Analytics / Monitoring

- PostHog wrapper
- Sentry
- core event audit

---

## Phase 15 — Offline / Recovery

- pending attempt queue
- active session restore
- conflict recovery

---

## Phase 16 — QA / Release

Critical E2E:

```text
new user
→ signup
→ onboarding
→ level test
→ first session
→ complete
→ reopen
→ due review
```

Premium E2E:

```text
free cap
→ paywall
→ purchase
→ entitlement
→ extra learning
```

---

# 구현 우선순위

```text
P0
학습 데이터 무결성

P1
학습 UX

P2
리텐션

P3
수익화

P4
고급 기능
```
