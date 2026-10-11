# PRD — Project LingoLoop MVP

## 0. Document Info

- Product: Project LingoLoop
- Version: 0.2
- Platform: iOS / Android
- Primary market: Korean English learners
- MVP focus: Adaptive vocabulary learning
- Status: Build-ready specification

---

# 1. Big Picture

## Product Vision

사용자가 직접 커리큘럼과 복습 일정을 관리하지 않아도 앱이 매일 **“지금 이 사용자에게 가장 필요한 영어 문제”**를 골라주는 개인화 학습 제품을 만든다.

핵심은 콘텐츠 소비가 아니라 사용자별 Knowledge State를 업데이트하는 것이다.

```text
User
↓
Question
↓
Attempt Data
↓
Knowledge State
↓
Review Schedule
↓
Next Best Question
```

## Product Promise

> 앱을 열면 오늘 해야 할 공부가 이미 준비되어 있고, 5~15분만 풀어도 학습 상태가 자동으로 갱신된다.

---

# 2. Problem

1. 사용자는 어디서부터 공부할지 결정하기 어렵다.
2. 이미 아는 단어와 모르는 단어가 섞여 비효율적이다.
3. 복습 타이밍을 직접 관리하기 어렵다.
4. 성과가 느리게 보여 중도 이탈한다.
5. 기존 단어장은 사용자의 실제 정오답/속도/힌트 사용을 충분히 활용하지 않는다.

---

# 3. Target User

## Primary

- 20~30대 한국인
- 취업, 업무, 여행, 자기계발 목적
- 하루 5~15분 학습 가능
- 단어장을 시작했다가 중도 포기한 경험이 있음
- 강의형 콘텐츠보다 짧은 인터랙션을 선호

## Secondary

- 중고등/대학생
- TOEIC 등 시험 전 기초 어휘 보강 사용자
- 직장인 비즈니스 영어 학습자

MVP에서는 Primary를 우선한다.

---

# 4. Jobs To Be Done

### Functional
“내 수준에 맞는 단어를 효율적으로 기억하고 싶다.”

### Emotional
“매일 조금씩 성장하고 있다는 느낌을 받고 싶다.”

### Habit
“계획을 세우지 않아도 앱을 열면 공부가 시작됐으면 좋겠다.”

---

# 5. MVP Scope

## P0 — 반드시 출시

### Account
- Email/Apple/Google Auth
- Session restore
- Logout
- Account deletion

### Onboarding
- Learning goal
- Self-reported level
- Daily goal
- Adaptive level test

### Vocabulary
- Context sentence
- Korean meaning cue
- Text input
- Hint
- Answer evaluation
- Correct/wrong feedback
- Audio playback

### Adaptive Learning
- `skillLevel`
- `wordDifficulty`
- `userWordMastery`
- Recommendation score
- Adaptive level adjustment

### SRS
- Due review
- Review stage
- Next review timestamp

### Retention
- Daily goal
- XP
- Streak

### Progress
- Current level
- Learned words
- Mastered words
- Weekly volume
- Accuracy
- Weak words

### Monetization
- Free daily cap
- Premium
- Paywall
- RevenueCat state sync

### Operations
- Admin content CMS
- Analytics
- Error monitoring

## P1 — MVP 이후
- Weakness mode 고도화
- Achievement
- Weekly report
- League

## P2
- Grammar
- Listening
- Pronunciation

## P3
- Scenario AI conversation
- Personalized AI tutor

---

# 6. Non-goals

MVP에서 제외:

- 소셜 피드
- 친구
- 리그
- 캐릭터 꾸미기
- 자유회화
- 커뮤니티
- 사용자 생성 단어장
- 웹 학습
- 자체 음성 모델
- 복잡한 ML 추천 모델

---

# 7. Core Learning Loop

```text
App Open
↓
Home
↓
Start Today's Learning
↓
Due Reviews
↓
New Words
↓
Answer
↓
Immediate Feedback
↓
Mastery Update
↓
SRS Update
↓
XP / Daily Progress
↓
Next Question
↓
Session Complete
```

---

# 8. Knowledge Model

## User Skill

사용자 글로벌 추정치:

```ts
skillLevel: number // 1.0 ~ 30.0
```

## Word Difficulty

```ts
difficulty: number // 1.0 ~ 30.0
```

## User Word Mastery

```ts
mastery: number // 0.0 ~ 1.0
```

Classification:

| Range | State |
|---|---|
| 0.00–0.19 | Unknown |
| 0.20–0.39 | Learning |
| 0.40–0.59 | Familiar |
| 0.60–0.79 | Strong |
| 0.80–1.00 | Mastered |

---

# 9. Answer Signals

저장해야 하는 최소 신호:

- correct / wrong / typo
- response time
- hint level
- prior mastery
- resulting mastery
- question difficulty
- session position
- attempt timestamp

초기 Mastery delta:

| Event | Delta |
|---|---:|
| fast correct, no hint | +0.12 |
| normal correct | +0.08 |
| slow correct | +0.05 |
| correct after hint | +0.02 |
| wrong | -0.10 |
| repeated wrong | -0.15 |

값은 `[0,1]`로 clamp한다.

---

# 10. Response-time Buckets

MVP 초기값:

- Fast: `< 3,000ms`
- Normal: `3,000–8,000ms`
- Slow: `> 8,000ms`

추후 개인별 median을 사용해 상대 기준으로 바꾼다.

---

# 11. SRS

초기 interval:

```ts
[1, 3, 7, 14, 30, 60, 120]
```

- Correct: stage + 1
- Wrong: stage - 2
- Minimum stage: 0
- `nextReviewAt = now + interval[stage]`

장기적으로 FSRS/개인화 SRS 도입 가능하나 MVP에서는 규칙 기반으로 시작한다.

---

# 12. Recommendation

```text
priority =
reviewUrgency × 0.40
+ difficultyFit × 0.25
+ weakness × 0.20
+ importance × 0.10
+ novelty × 0.05
```

### Review Urgency
`nextReviewAt`이 지났을수록 높다.

### Difficulty Fit
`abs(userSkill - wordDifficulty)`가 작을수록 높다.

### Weakness
mastery가 낮고 최근 오답이 많을수록 높다.

### Importance
frequency rank / curriculum priority 기반.

### Novelty
신규 학습 비율을 유지하기 위한 보정치.

---

# 13. Daily Session Composition

기본 Daily Goal: `20 questions`

기본 비율:

```text
Review 60%
New 40%
```

Due Review가 많으면 Review가 우선한다.

예:
- due 8 → review 8 + new 12
- due 12 → review 12 + new 8
- due 18 → review 18 + new 2
- due 25 → review 20

초기 MVP에서는 Daily Goal보다 due review가 많아도 **세션당 목표 수를 임의로 초과시키지 않는다**. 완료 후 `More Review`로 확장한다.

---

# 14. Level Test

- 20문제 기본
- Self-reported level을 starting point로 사용
- 정답 시 difficulty 상승
- 오답 시 difficulty 하락
- 최종 결과로 `skillLevel` 생성

예시 heuristic:

```text
start = selfReportedMap
correct → +1.5
wrong → -1.0
```

최종 skill은 마지막 문항 하나가 아니라 전체 응답을 가중 평균한다.

---

# 15. Level Adaptation After Onboarding

최근 30개 유효 문제를 기준:

- accuracy >= 90% AND median response fast → +0.3
- accuracy 70–90% → 유지
- accuracy < 70% → -0.3

하루 변화 폭에 cap을 둔다.

```text
max daily level movement = ±0.6
```

---

# 16. Vocabulary Content Model

필수:

- lemma
- display form
- part of speech
- Korean meaning
- difficulty
- frequency rank
- example English
- example Korean
- target form
- explanation
- audio URL
- tags
- content status

MVP 콘텐츠 목표:

- 1,500–3,000 words
- 각 핵심 sense마다 1개 이상의 예문
- Beginner~Intermediate 우선

---

# 17. Content Pipeline

```text
Source vocabulary
↓
AI draft generation
↓
Meaning / example / translation
↓
Automated validation
↓
Human review
↓
Audio
↓
Publish
↓
User error-log review
↓
Revision
```

AI 생성물을 자동 Production 게시하지 않는다.

---

# 18. Hint Rules

### Hint 1
첫 글자/철자 길이:

```text
m _ _
```

### Hint 2
형태 또는 의미 단서:

```text
meet의 과거형
```

힌트 사용은 학습 신호이므로 반드시 저장한다.

---

# 19. Feedback Rules

## Correct
- 성공 상태
- 정답
- 짧은 의미/형태 설명
- 전체 예문
- audio
- next CTA

## Wrong
- 부정적 감정 최소화
- 사용자의 답을 조롱하지 않음
- 정답 강조
- 왜 틀렸는지 1~3문장
- 필요 시 형태 변화
- next CTA

## Typo
완전 오답과 구분한다.

---

# 20. Gamification

## XP

- correct: +5
- wrong but completed: +2
- daily goal complete: +20
- 7-day milestone: +50

XP는 Skill 계산에 사용하지 않는다.

## Streak

하루 최소 `5 completed questions`이면 streak-qualified.

Timezone은 `UserProfile.timezone` 기준.

---

# 21. Free / Premium

## Free
- 하루 20문제
- 기본 리뷰
- 기본 progress
- streak
- 기본 audio

## Premium
- 무제한 학습
- weakness mode
- detailed stats
- 향후 AI 기능 포함 가능

가격/무료체험은 출시 직전 별도 실험한다.

---

# 22. Analytics

필수:

```text
app_opened
signup_completed
onboarding_completed
level_test_started
level_test_completed
learning_session_started
question_viewed
hint_used
question_answered
feedback_viewed
learning_session_completed
daily_goal_completed
streak_qualified
paywall_viewed
purchase_started
subscription_activated
subscription_cancelled
```

---

# 23. North Star

**Weekly Completed Learning Sessions**

보조 지표:

- onboarding completion
- first session completion
- D1
- D7
- daily goal completion
- questions/session
- review completion
- paywall view → purchase

---

# 24. Internal MVP Targets

제품 판단용 목표치:

- Onboarding completion > 70%
- First session completion > 70%
- D1 > 35%
- D7 > 15%
- Daily goal completion > 35%

이는 보장된 업계 기준이 아니라 초기 내부 가설이다.

---

# 25. Notifications

MVP:

- review due
- evening goal reminder
- streak risk

원칙:
- 빈도 과다 금지
- streak anxiety를 과도하게 자극하지 않음
- 사용자가 쉽게 끌 수 있어야 함

---

# 26. Offline / Recovery

- 현재 session id local persistence
- pending attempt queue
- network restore 시 sync
- duplicate submit 방지
- 앱 종료 후 resume

---

# 27. Accessibility

- 44pt 이상 touch target
- Dynamic Type 고려
- 색상만으로 상태 전달 금지
- screen reader label
- haptic은 보조 수단
- Reduce Motion 존중

---

# 28. Privacy

최소 수집 원칙.

필요 데이터:
- account
- learning progress
- subscription state
- analytics identifiers

불필요:
- precise location
- contacts
- unrelated personal data

---

# 29. Product Roadmap

```text
MVP
Vocabulary Core
↓
V1.5
Weakness / Achievement / Weekly report
↓
V2
Grammar
↓
V2.5
Listening / Pronunciation
↓
V3
Scenario Conversation
↓
V4
AI Tutor + Knowledge Graph
```

---

# 30. Acceptance: MVP Complete

- [ ] Auth
- [ ] Onboarding
- [ ] Level Test
- [ ] Skill Level created
- [ ] Daily Session generation
- [ ] Due review selection
- [ ] New-word selection
- [ ] Question rendering
- [ ] Answer evaluation
- [ ] Attempt persisted
- [ ] Mastery updated
- [ ] SRS updated
- [ ] XP updated
- [ ] Daily progress updated
- [ ] Streak updated
- [ ] Session resume
- [ ] Progress screen
- [ ] Free cap
- [ ] Subscription state
- [ ] Content CMS
- [ ] Analytics
- [ ] Core tests
