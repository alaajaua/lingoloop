# Technical Specification — Project LingoLoop

## 1. Stack

### Mobile
- React Native
- Expo
- TypeScript
- Expo Router
- TanStack Query
- Zustand
- React Hook Form + Zod

### API
- NestJS
- TypeScript
- REST for MVP

### DB
- PostgreSQL
- Prisma

### Cache / Queue
- Redis
- BullMQ only when needed for async jobs

### Admin
- Next.js
- TypeScript

### Storage
- S3-compatible object storage

### Analytics
- PostHog abstraction wrapper

### Monitoring
- Sentry

### Subscription
- RevenueCat

### Push
- Expo Notifications

---

# 2. Monorepo

```text
lingoloop/
├ apps/
│  ├ mobile/
│  ├ api/
│  └ admin/
├ packages/
│  ├ ui/
│  ├ types/
│  ├ config/
│  ├ learning-engine/
│  └ analytics/
├ prisma/
├ docs/
├ scripts/
├ package.json
└ turbo.json
```

---

# 3. Mobile Structure

```text
apps/mobile/
├ app/
│  ├ (auth)/
│  ├ onboarding/
│  ├ (tabs)/
│  ├ learn/
│  ├ premium/
│  └ settings/
├ components/
│  ├ learning/
│  ├ feedback/
│  ├ progress/
│  └ common/
├ hooks/
├ services/
├ stores/
├ theme/
└ utils/
```

---

# 4. API Modules

```text
src/
├ auth/
├ users/
├ onboarding/
├ content/
├ level-test/
├ learning/
├ mastery/
├ review/
├ progress/
├ gamification/
├ subscriptions/
├ notifications/
├ analytics/
├ admin/
└ common/
```

---

# 5. Learning Engine Package

```text
packages/learning-engine/
├ answer/
│  ├ normalize.ts
│  ├ typo.ts
│  └ evaluate.ts
├ mastery/
│  ├ delta.ts
│  ├ update.ts
│  └ classify.ts
├ srs/
│  ├ intervals.ts
│  └ schedule.ts
├ recommendation/
│  ├ urgency.ts
│  ├ difficulty-fit.ts
│  ├ priority.ts
│  └ select.ts
└ level/
   ├ estimate.ts
   └ update.ts
```

No database/network dependency inside pure algorithm functions.

---

# 6. Core Schema

## User

```prisma
model User {
  id            String   @id @default(cuid())
  email         String?  @unique
  name          String?
  authProvider  String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  profile       UserProfile?
  mastery       UserWordMastery[]
  sessions      LearningSession[]
  attempts      QuestionAttempt[]
}
```

## UserProfile

```prisma
model UserProfile {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id])

  learningGoals       String[]
  selfReportedLevel   Int?
  skillLevel          Float    @default(5)
  dailyGoal           Int      @default(20)
  timezone            String   @default("Asia/Seoul")
  onboardingCompleted Boolean  @default(false)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

## Word

```prisma
model Word {
  id            String   @id @default(cuid())
  lemma         String
  displayWord   String
  partOfSpeech  String
  difficulty    Float
  frequencyRank Int?
  status        String   @default("draft")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  meanings      WordMeaning[]
  examples      Example[]
  mastery       UserWordMastery[]
}
```

## WordMeaning

```prisma
model WordMeaning {
  id           String @id @default(cuid())
  wordId       String
  word         Word   @relation(fields: [wordId], references: [id])
  meaningKo    String
  definitionEn String?
  senseOrder   Int    @default(1)
}
```

## Example

```prisma
model Example {
  id           String @id @default(cuid())
  wordId       String
  word         Word   @relation(fields: [wordId], references: [id])

  sentenceEn   String
  sentenceKo   String
  targetForm   String
  explanation String?
  audioUrl     String?
  difficulty   Float
  status       String @default("draft")
}
```

## UserWordMastery

```prisma
model UserWordMastery {
  id                String   @id @default(cuid())
  userId            String
  wordId            String
  user              User     @relation(fields: [userId], references: [id])
  word              Word     @relation(fields: [wordId], references: [id])

  mastery           Float    @default(0)
  attemptCount      Int      @default(0)
  correctCount      Int      @default(0)
  wrongCount        Int      @default(0)
  currentSrsStage   Int      @default(0)
  lastSeenAt        DateTime?
  nextReviewAt      DateTime?
  averageResponseMs Int?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([userId, wordId])
  @@index([userId, nextReviewAt])
}
```

## LearningSession

```prisma
model LearningSession {
  id                     String   @id @default(cuid())
  userId                 String
  user                   User     @relation(fields: [userId], references: [id])
  type                   String
  targetQuestionCount    Int
  completedQuestionCount Int      @default(0)
  correctCount           Int      @default(0)
  wrongCount             Int      @default(0)
  xpEarned               Int      @default(0)
  status                 String   @default("active")
  startedAt              DateTime @default(now())
  completedAt            DateTime?

  attempts               QuestionAttempt[]
}
```

## QuestionAttempt

```prisma
model QuestionAttempt {
  id               String   @id @default(cuid())
  clientAttemptId  String   @unique
  sessionId        String
  userId           String
  wordId           String
  exampleId        String

  answer           String
  normalizedAnswer String

  result           String
  hintLevel        Int      @default(0)
  responseTimeMs   Int

  masteryBefore    Float?
  masteryAfter     Float?

  createdAt        DateTime @default(now())

  session          LearningSession @relation(fields: [sessionId], references: [id])
  user             User            @relation(fields: [userId], references: [id])

  @@index([sessionId, createdAt])
}
```

## UserDailyProgress

```prisma
model UserDailyProgress {
  id                 String   @id @default(cuid())
  userId             String
  localDate          String
  questionsCompleted Int      @default(0)
  correctCount       Int      @default(0)
  xpEarned           Int      @default(0)
  goalCompleted      Boolean  @default(false)
  streakQualified    Boolean  @default(false)

  @@unique([userId, localDate])
}
```

## UserStreak

```prisma
model UserStreak {
  userId            String @id
  currentStreak     Int    @default(0)
  longestStreak     Int    @default(0)
  lastQualifiedDate String?
}
```

## XPTransaction

```prisma
model XPTransaction {
  id          String   @id @default(cuid())
  userId      String
  amount      Int
  reason      String
  referenceId String?
  createdAt   DateTime @default(now())

  @@index([userId, createdAt])
}
```

## Subscription

```prisma
model Subscription {
  id         String   @id @default(cuid())
  userId     String   @unique
  provider   String
  productId  String?
  status     String
  startedAt  DateTime?
  expiresAt  DateTime?
  updatedAt  DateTime @updatedAt
}
```

---

# 7. API Contract

## Auth

```text
POST /auth/signup
POST /auth/login
POST /auth/logout
GET  /auth/me
```

## Onboarding

```text
PATCH /onboarding/profile
POST  /level-test/sessions
POST  /level-test/sessions/:id/answers
POST  /level-test/sessions/:id/complete
```

## Home

```text
GET /home
```

Example:

```json
{
  "dailyGoal": 20,
  "completed": 12,
  "reviewsDue": 8,
  "streak": 9,
  "xp": 1240,
  "skillLevel": 8.4,
  "isPremium": false
}
```

## Learning

```text
POST /learning/sessions
GET  /learning/sessions/:id
GET  /learning/sessions/:id/current-question
POST /learning/sessions/:id/answers
POST /learning/sessions/:id/complete
```

Create request:

```json
{
  "type": "daily"
}
```

Answer request:

```json
{
  "clientAttemptId": "uuid",
  "questionId": "q123",
  "answer": "met",
  "responseTimeMs": 3420,
  "hintLevel": 0
}
```

Answer response:

```json
{
  "result": "correct",
  "correctAnswer": "met",
  "masteryBefore": 0.42,
  "masteryAfter": 0.50,
  "nextReviewAt": "2026-10-07T03:00:00Z",
  "feedback": {
    "title": "좋아요!",
    "explanation": "meet의 과거형은 met입니다."
  },
  "session": {
    "completed": 13,
    "target": 20,
    "xpEarned": 65
  }
}
```

## Progress

```text
GET /progress/overview
GET /progress/vocabulary?filter=all|weak|learning|mastered
GET /progress/history
```

## Subscription

```text
GET  /subscription/status
POST /subscription/webhooks/revenuecat
```

---

# 8. Answer Normalization

Order:

1. trim
2. Unicode normalize
3. lowercase
4. normalize apostrophe
5. collapse spaces

Do not strip meaningful hyphens blindly.

---

# 9. Typo Detection

MVP:
- Levenshtein distance
- transposition detection
- target length-sensitive threshold

Never mark another valid word as “typo” only because distance is small.

---

# 10. Mastery Algorithm

Pure function:

```ts
type AttemptSignal = {
  result: "correct" | "wrong" | "typo";
  responseTimeMs: number;
  hintLevel: number;
  consecutiveWrong: number;
}
```

Pseudo:

```ts
if (result === "correct" && responseTimeMs < 3000 && hintLevel === 0) delta = 0.12;
else if (result === "correct" && hintLevel === 0 && responseTimeMs <= 8000) delta = 0.08;
else if (result === "correct" && hintLevel === 0) delta = 0.05;
else if (result === "correct") delta = 0.02;
else delta = consecutiveWrong > 0 ? -0.15 : -0.10;
```

---

# 11. SRS

```ts
const INTERVAL_DAYS = [1, 3, 7, 14, 30, 60, 120];
```

Correct:
```ts
stage = Math.min(stage + 1, INTERVAL_DAYS.length - 1)
```

Wrong:
```ts
stage = Math.max(stage - 2, 0)
```

---

# 12. Recommendation

Candidate pool:

1. Due reviews
2. Near-due weak words
3. New words in difficulty band

Difficulty band:

```text
skillLevel - 2 ≤ difficulty ≤ skillLevel + 2
```

Priority:

```ts
0.40 * reviewUrgency +
0.25 * difficultyFit +
0.20 * weakness +
0.10 * importance +
0.05 * novelty
```

---

# 13. Answer Transaction

`POST /answers` must run in one DB transaction:

1. idempotency check
2. validate active session
3. evaluate answer
4. create attempt
5. update mastery
6. update SRS
7. update session
8. update daily progress
9. create XP transaction
10. update streak if threshold crossed

If any critical write fails, rollback.

---

# 14. Idempotency

Client generates:

```text
clientAttemptId = UUID
```

Server unique constraint guarantees duplicate submit safety.

---

# 15. Offline

Local persistence:

- active session id
- current question id
- pending attempt payloads
- last known home summary

When network returns:
- sync pending attempts in order
- server remains source of truth
- conflict → fetch current session state

---

# 16. State Management

## TanStack Query
Server state:
- home
- session
- progress
- subscription

## Zustand
Ephemeral client state:
- auth UI
- answer draft
- hint sheet visibility
- local timer
- accessibility preferences

Do not duplicate durable server learning progress in Zustand.

---

# 17. Analytics

Use wrapper:

```ts
analytics.track("question_answered", {...})
```

Do not call PostHog SDK directly from feature screens.

---

# 18. Content CMS

Admin P0:

- word list
- word create/edit
- meaning create/edit
- example create/edit
- content state
- publish
- archive
- search/filter

Status:

```text
draft → review → published → archived
```

---

# 19. AI Content Assistance

Admin-only:

- generate example
- generate translation
- generate explanation
- lint naturalness

Always save as `draft`.

---

# 20. Security

- HTTPS
- access/refresh token rotation
- secure token storage
- rate limits
- RBAC for admin
- audit log for content publish
- delete-account workflow
- secrets outside repository

---

# 21. Performance Targets

MVP targets:

- Home p95 API < 500ms under normal load
- Answer submit p95 < 700ms
- Learning transition feels < 250ms after API response
- cached audio starts < 300ms when locally available

---

# 22. Testing

## Unit
- normalization
- typo detection
- mastery delta
- SRS
- priority
- level update

## Integration
- create session
- submit answer
- transaction update
- free cap
- streak rollover

## E2E
- new signup → first session complete
- returning user → daily complete
- offline attempt → sync
- purchase → entitlement
- delete account

---

# 23. Build Order

```text
Phase 0 Repo
Phase 1 Auth + DB
Phase 2 Content
Phase 3 Onboarding
Phase 4 Level Test
Phase 5 Question UI
Phase 6 Session API
Phase 7 Mastery
Phase 8 SRS
Phase 9 Recommendation
Phase 10 XP / Goal / Streak
Phase 11 Progress
Phase 12 Premium
Phase 13 Admin
Phase 14 Analytics
Phase 15 QA
```

---

# 24. Claude Code Guardrails

1. Read relevant docs before changing code.
2. No business logic inside React components.
3. No learning algorithm inside NestJS controllers.
4. `packages/learning-engine` functions stay pure.
5. Server is source of truth for mastery/XP/streak.
6. All mutation endpoints support retry safety.
7. No hard-coded UI colors outside theme tokens.
8. No raw analytics SDK calls in feature code.
9. Write tests before changing core learning algorithms.
10. Do not implement P1/P2/P3 unless explicitly requested.

---

# 25. Initial Claude Code Prompt

```text
You are implementing Project LingoLoop, a production-oriented adaptive
English vocabulary learning MVP.

Before writing code, read:
- docs/PRD.md
- docs/IA.md
- docs/TECHNICAL_SPEC.md
- docs/SCREEN_SPEC.md
- docs/DESIGN_SYSTEM.md
- docs/WIREFRAME.md

Implement one vertical slice at a time.

Server is the source of truth for learning state.
Keep algorithmic logic in packages/learning-engine.
Do not implement out-of-scope grammar, listening, speaking,
league, character or AI conversation features.

For every slice:
1. state the screen/API IDs being implemented
2. add types/schema as needed
3. implement API and UI
4. add analytics
5. add tests
6. run lint/typecheck/tests
7. summarize changed files and remaining risks
```
