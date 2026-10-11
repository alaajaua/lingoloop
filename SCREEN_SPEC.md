# Screen Specification — Project LingoLoop

## 0. 사용 방법

이 문서는 UI 구현 티켓의 기준이다.

각 화면은 다음을 반드시 가진다.

- Purpose
- Entry / Exit
- Components
- State
- API
- Analytics
- Validation
- Edge Cases
- Loading / Empty / Error
- Accessibility
- Acceptance Criteria

공통 원칙:

1. Server is source of truth.
2. 학습 중 Bottom Tabs는 숨긴다.
3. `S31 → S32/S33 → S31`이 가장 중요한 반복 루프다.
4. API mutation은 중복 tap에 안전해야 한다.
5. 화면 구현 시 `DESIGN_SYSTEM.md` token을 사용한다.

---

# Screen Index

- `S01` Splash
- `S02` Welcome
- `S03` Sign Up
- `S04` Login
- `S10` Learning Goal
- `S11` Self Level
- `S12` Daily Goal
- `S13` Level Test Intro
- `S14` Level Test Question
- `S15` Level Result
- `S20` Home
- `S21` Home — Goal Completed
- `S30` Session Preparing
- `S31` Vocabulary Question
- `S32` Correct Feedback
- `S33` Wrong / Typo Feedback
- `S34` Hint Sheet
- `S35` Session Complete
- `S36` Extra Learning Selector
- `S40` Progress Overview
- `S41` Vocabulary Status
- `S42` Learning History
- `S50` Paywall
- `S51` Purchase Success
- `S52` Restore Purchase Result
- `S60` Settings
- `S61` Account
- `S62` Daily Goal Setting
- `S63` Notifications
- `S64` Subscription
- `S65` Legal
- `S66` Delete Account

---

## S01 — Splash

### Purpose
앱 초기 상태 확인과 안전한 라우팅

### Entry
- 앱 실행

### Exit
- S02/S10~S15/S20

### Components
- BrandMark
- LoadingIndicator(optional)

### Local / View State
- authState
- profileState
- routeDecision

### API / Data
- GET /auth/me (token이 있을 때)

### Analytics Events
- app_opened

### Validation
- 유효하지 않은 refresh token → guest 처리

### Edge Cases
- Cold start network 지연
- stale local token
- 서버 장애

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
브랜드 마크 중앙. 1초 이상 불필요하게 머물지 않는다.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 로그인 상태에 맞는 목적지로 자동 이동
- 라우팅 중 중복 navigation 없음
- offline에서 마지막 안전 화면으로 복구

---

## S02 — Welcome

### Purpose
가치 제안과 가입/로그인 분기

### Entry
- S01 guest

### Exit
- S03/S04

### Components
- BrandIntro
- ValueProposition
- PrimaryButton
- LoginLink

### Local / View State
- none

### API / Data
- 없음

### Analytics Events
- welcome_viewed
- signup_cta_tapped
- login_cta_tapped

### Validation
- 없음

### Edge Cases
- 작은 화면
- Dynamic Type

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
상단 장식 최소, 하단 Primary CTA 고정 가능.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 시작하기가 가장 강한 CTA
- 로그인 경로 노출
- 스크린리더 순서 자연스러움

---

## S03 — Sign Up

### Purpose
최소 마찰로 계정 생성

### Entry
- S02

### Exit
- S10

### Components
- AppleButton
- GoogleButton
- EmailSignupForm
- TermsConsent

### Local / View State
- provider
- email
- password
- loading
- error

### API / Data
- POST /auth/signup

### Analytics Events
- signup_started
- signup_completed
- signup_failed

### Validation
- 이메일 형식
- 비밀번호 정책
- 약관 동의

### Edge Cases
- 중복 이메일
- OAuth cancel
- network fail

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
소셜 가입 우선, email은 대안.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 성공 시 S10
- 실패 시 입력값 유지
- 중복 제출 방지

---

## S04 — Login

### Purpose
기존 사용자 로그인

### Entry
- S02 또는 auth expiry

### Exit
- S20 또는 resume route

### Components
- AppleButton
- GoogleButton
- EmailLoginForm
- ForgotPasswordLink

### Local / View State
- email
- password
- loading
- error

### API / Data
- POST /auth/login
- GET /auth/me

### Analytics Events
- login_started
- login_completed
- login_failed

### Validation
- 이메일
- 필수 입력

### Edge Cases
- 잘못된 비밀번호
- 탈퇴 계정
- OAuth cancel

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
재로그인 시 기존 의도를 보존.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 성공 후 onboarding 상태 기반 라우팅
- 오류 메시지 구체적
- loading 중 버튼 lock

---

## S10 — Learning Goal

### Purpose
개인화 태그 수집

### Entry
- S03 또는 resume

### Exit
- S11

### Components
- StepHeader
- GoalOptionCards
- ContinueButton

### Local / View State
- selectedGoals

### API / Data
- PATCH /onboarding/profile

### Analytics Events
- onboarding_goal_viewed
- learning_goal_selected

### Validation
- 최소 1개 선택

### Edge Cases
- 저장 실패
- 뒤로가기

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
복수 선택 카드 2열 또는 세로 리스트.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 1개 이상 선택 전 CTA disabled
- 저장 성공 후 S11

---

## S11 — Self Level

### Purpose
레벨 테스트 시작 난이도 추정

### Entry
- S10

### Exit
- S12

### Components
- StepHeader
- LevelRadioCards
- ContinueButton

### Local / View State
- selfReportedLevel

### API / Data
- PATCH /onboarding/profile

### Analytics Events
- self_level_viewed
- self_level_selected

### Validation
- 한 항목 선택

### Edge Cases
- 저장 실패

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
문구는 CEFR 용어보다 생활 언어 사용.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 선택값 저장
- S12 이동

---

## S12 — Daily Goal

### Purpose
초기 습관 강도 설정

### Entry
- S11

### Exit
- S13

### Components
- StepHeader
- GoalCards
- RecommendedBadge
- ContinueButton

### Local / View State
- dailyGoal

### API / Data
- PATCH /onboarding/profile

### Analytics Events
- daily_goal_viewed
- daily_goal_selected

### Validation
- 10/20/30/50 중 선택

### Edge Cases
- 저장 실패

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
20문제를 Recommended.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 기본 20
- 선택값 서버 저장
- 시간 예상치 표시

---

## S13 — Level Test Intro

### Purpose
테스트 목적/시간 안내

### Entry
- S12

### Exit
- S14

### Components
- IllustrationAbstract
- Title
- Body
- DurationInfo
- StartButton

### Local / View State
- none

### API / Data
- POST /level-test/sessions

### Analytics Events
- level_test_intro_viewed
- level_test_started

### Validation
- 없음

### Edge Cases
- session create 실패

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
시험 불안감을 낮추는 간단한 설명.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- Start 시 session 생성
- 실패 시 retry

---

## S14 — Level Test Question

### Purpose
적응형 초기 난이도 측정

### Entry
- S13/계속하기

### Exit
- S14 또는 S15

### Components
- ProgressBar
- SentencePrompt
- MeaningCue
- AnswerInput
- SubmitButton
- InlineFeedback(optional)

### Local / View State
- answer
- question
- responseTimer
- submitted
- loading

### API / Data
- POST /level-test/sessions/:id/answers
- POST /level-test/sessions/:id/complete

### Analytics Events
- level_test_question_viewed
- level_test_answered

### Validation
- 빈 답 제출 금지

### Edge Cases
- network fail
- duplicate submit
- 앱 종료

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
일반 학습과 시각적으로 유사하되 XP/Streak 없음.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 답변 중복 저장 없음
- 20문제 완료 후 S15
- resume 가능

---

## S15 — Level Result

### Purpose
초기 skillLevel을 이해 가능하게 제시

### Entry
- S14 complete

### Exit
- S30

### Components
- ResultNumber
- LevelDescription
- EstimatedVocabulary(optional)
- StartLearningButton

### Local / View State
- result

### API / Data
- level-test complete response

### Analytics Events
- level_test_completed
- first_learning_cta_tapped

### Validation
- 없음

### Edge Cases
- result fetch 실패

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
숫자보다 의미 설명 우선.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- skillLevel 표시
- 첫 학습 CTA
- onboardingCompleted=true

---

## S20 — Home

### Purpose
오늘 학습으로 가장 빠르게 진입

### Entry
- S01 returning / tabs

### Exit
- S30/S40/S60

### Components
- Greeting
- DailyGoalCard
- StartLearningButton
- ReviewDueChip
- StreakChip
- LevelCard
- WeeklyMiniStats
- BottomTabs

### Local / View State
- homeSummary
- refreshing

### API / Data
- GET /home

### Analytics Events
- home_viewed
- daily_learning_cta_tapped

### Validation
- 없음

### Edge Cases
- first load
- pull refresh
- home API fail
- no reviews

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
Start CTA가 fold 안쪽. 카드 과밀 금지.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 핵심 수치 표시
- CTA 1개가 최우선
- refresh 지원
- error retry

---

## S21 — Home — Goal Completed

### Purpose
오늘 목표 달성 후 상태

### Entry
- S35 complete

### Exit
- S36/S40

### Components
- CelebrationHeader
- GoalCompleteCard
- ExtraLearningButton
- WeeklyMiniStats
- BottomTabs

### Local / View State
- homeSummary

### API / Data
- GET /home

### Analytics Events
- goal_completed_home_viewed
- extra_learning_tapped

### Validation
- 없음

### Edge Cases
- home refresh fail

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
완료감은 주되 더 공부하기를 강요하지 않는다.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 20/20 이상 표시
- streak 최신 상태
- 추가학습은 secondary

---

## S30 — Session Preparing

### Purpose
추천 문제 큐 생성 중 상태

### Entry
- S20/S15/S36

### Exit
- S31 또는 S50

### Components
- ProgressIndicator
- PreparingMessage

### Local / View State
- sessionCreateState

### API / Data
- POST /learning/sessions

### Analytics Events
- learning_session_create_started
- learning_session_started
- learning_session_create_failed

### Validation
- free cap 체크

### Edge Cases
- no content
- free cap
- server fail

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
1초 이상이면 skeleton/메시지 표시.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 세션 생성 성공 시 S31
- cap이면 S50
- 재시도 가능

---

## S31 — Vocabulary Question

### Purpose
핵심 학습 입력

### Entry
- S30 또는 feedback next

### Exit
- S32/S33/S34

### Components
- SessionHeader
- ProgressBar
- SentencePrompt
- TranslationCue
- AnswerInput
- HintButton
- SubmitButton

### Local / View State
- question
- answer
- timer
- hintLevel
- submitting

### API / Data
- GET /learning/sessions/:id/current-question
- POST /learning/sessions/:id/answers

### Analytics Events
- question_viewed
- answer_submitted

### Validation
- trim 후 empty 금지

### Edge Cases
- offline
- duplicate tap
- question stale
- keyboard overlap

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
학습 중 bottom nav 숨김. 입력창 자동 focus.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- Enter/CTA 제출
- 제출 후 lock
- clientAttemptId 생성
- offline retry queue
- 응답에 따라 feedback

---

## S32 — Correct Feedback

### Purpose
정답 후 강화와 이해

### Entry
- S31 correct

### Exit
- S31/S35

### Components
- FeedbackHeader
- CorrectAnswer
- Explanation
- Example
- AudioButton
- NextButton

### Local / View State
- answerResponse
- audioState

### API / Data
- 다음 question은 기존 response 또는 GET current-question

### Analytics Events
- feedback_viewed
- audio_played
- next_question_tapped

### Validation
- 없음

### Edge Cases
- audio fail
- next preload fail

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
success 색은 배경 보조 수준.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 정답/설명 표시
- Next 1차 CTA
- audio 실패가 진행 차단하지 않음

---

## S33 — Wrong / Typo Feedback

### Purpose
오답 원인을 짧고 정확하게 설명

### Entry
- S31 wrong/typo

### Exit
- S31/S35

### Components
- FeedbackHeader
- UserAnswer(optional)
- CorrectAnswer
- Explanation
- Morphology(optional)
- AudioButton
- NextButton

### Local / View State
- answerResponse

### API / Data
- 없음

### Analytics Events
- feedback_viewed
- wrong_feedback_viewed
- typo_feedback_viewed

### Validation
- 없음

### Edge Cases
- 설명 없음
- audio fail

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
Wrong과 Typo 카피를 구분.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 정답이 명확히 보임
- 사용자 비난 표현 없음
- Next 가능

---

## S34 — Hint Sheet

### Purpose
문제 해결을 돕되 학습 신호 기록

### Entry
- S31 hint tap

### Exit
- S31

### Components
- BottomSheet
- HintLevel1
- RevealMoreButton
- CloseButton

### Local / View State
- hintLevel

### API / Data
- 힌트 노출 자체는 local; 제출 payload에 hintLevel 포함

### Analytics Events
- hint_used

### Validation
- 최대 level 2

### Edge Cases
- 중복 이벤트

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
bottom sheet 사용. 답 전체 공개 금지.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 힌트 level 증가
- S31 입력 유지
- analytics 1회씩

---

## S35 — Session Complete

### Purpose
세션 성취를 요약

### Entry
- 마지막 feedback

### Exit
- S21/S36

### Components
- CompletionMark
- SummaryStats
- XPResult
- StreakResult
- DoneButton
- ExtraButton

### Local / View State
- sessionResult

### API / Data
- POST /learning/sessions/:id/complete

### Analytics Events
- learning_session_completed
- daily_goal_completed

### Validation
- complete idempotent

### Edge Cases
- complete API retry
- 이미 완료된 세션

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
짧은 celebration. 과도한 confetti 금지.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- stats 일치
- XP 반영
- goal/streak 상태 반영
- Done → Home

---

## S36 — Extra Learning Selector

### Purpose
목표 달성 후 자발적 추가 학습 선택

### Entry
- S21/S35

### Exit
- S30/S50

### Components
- OptionCardReview
- OptionCardNew
- OptionCardWeakness
- CloseButton

### Local / View State
- entitlement
- dueCount

### API / Data
- GET /subscription/status (cache 가능)

### Analytics Events
- extra_learning_viewed
- extra_learning_option_selected

### Validation
- free cap

### Edge Cases
- premium gated
- no due review

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
모달 또는 페이지. 3개 이하 옵션.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 가용 옵션만 활성
- premium gate 자연스럽게

---

## S40 — Progress Overview

### Purpose
학습 성장 상태 요약

### Entry
- bottom tab

### Exit
- S41/S42

### Components
- LevelSummary
- StatCards
- WeeklyChart
- VocabularyStatusCard
- HistoryLink
- BottomTabs

### Local / View State
- overview
- period

### API / Data
- GET /progress/overview

### Analytics Events
- progress_overview_viewed
- progress_period_changed

### Validation
- period day/week/month

### Edge Cases
- empty new user
- API fail

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
숫자보다 변화/상태 중심.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 기간 변경
- 정확한 데이터
- drilldown 가능

---

## S41 — Vocabulary Status

### Purpose
학습 단어 상태 탐색

### Entry
- S40

### Exit
- S40

### Components
- FilterTabs
- Search(optional P1)
- WordList
- MasteryBadge
- NextReviewLabel

### Local / View State
- filter
- items
- pagination

### API / Data
- GET /progress/vocabulary

### Analytics Events
- vocabulary_progress_viewed
- vocabulary_filter_changed

### Validation
- filter enum

### Edge Cases
- empty filter
- pagination fail

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
weak/learning/mastered 상태를 텍스트+색으로 표현.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 필터 작동
- pagination
- empty state

---

## S42 — Learning History

### Purpose
일자/세션 기록 확인

### Entry
- S40

### Exit
- S40

### Components
- DateGroup
- SessionRow
- Accuracy
- XP
- Duration(optional)

### Local / View State
- history
- cursor

### API / Data
- GET /progress/history

### Analytics Events
- learning_history_viewed

### Validation
- 없음

### Edge Cases
- no history
- pagination fail

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
상세 과잉 금지.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 최신순
- 세션 타입 구분
- cursor pagination

---

## S50 — Paywall

### Purpose
프리미엄 가치 제안과 구매

### Entry
- free cap/premium feature

### Exit
- S51/원래 화면

### Components
- BenefitList
- PlanSelector
- Price
- PrimaryPurchaseButton
- RestoreButton
- LegalLinks
- CloseButton

### Local / View State
- selectedPlan
- purchaseState

### API / Data
- RevenueCat SDK
- GET /subscription/status

### Analytics Events
- paywall_viewed
- plan_selected
- purchase_started
- purchase_failed

### Validation
- 스토어 상품 로드 성공 확인

### Edge Cases
- store unavailable
- purchase cancel
- pending purchase

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
학습을 방해한 직후 강압적 카피 금지.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 실가격 표시
- restore 제공
- close 가능
- 구매 중 중복 방지

---

## S51 — Purchase Success

### Purpose
권한 활성화 확인 후 원래 의도로 복귀

### Entry
- S50 success

### Exit
- origin

### Components
- SuccessMark
- BenefitsUnlocked
- ContinueButton

### Local / View State
- entitlement

### API / Data
- GET /subscription/status

### Analytics Events
- subscription_activated
- purchase_success_viewed

### Validation
- entitlement active

### Edge Cases
- webhook 지연

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
클라이언트 entitlement를 즉시 반영하되 서버 sync 상태 표시 가능.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- premium 활성
- Continue가 origin 복귀

---

## S52 — Restore Purchase Result

### Purpose
복원 결과 전달

### Entry
- S50 restore

### Exit
- S50/S64

### Components
- ResultState
- Message
- ContinueButton

### Local / View State
- restoreResult

### API / Data
- RevenueCat restore

### Analytics Events
- restore_started
- restore_completed
- restore_failed

### Validation
- 없음

### Edge Cases
- no purchase found
- store error

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
성공/없음/오류 세 상태.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 명확한 결과
- retry 가능

---

## S60 — Settings

### Purpose
계정/학습/알림/구독 설정 허브

### Entry
- bottom tab

### Exit
- S61~S66

### Components
- SettingsList
- AccountSummary
- BottomTabs

### Local / View State
- profile
- subscription

### API / Data
- GET /auth/me
- GET /subscription/status

### Analytics Events
- settings_viewed

### Validation
- 없음

### Edge Cases
- profile fail

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
일반 iOS/Android 설정 패턴.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 각 메뉴 이동
- premium 상태 표시
- logout는 account에 배치

---

## S61 — Account

### Purpose
프로필 및 로그아웃/탈퇴 진입

### Entry
- S60

### Exit
- S60/S66/S04

### Components
- AccountInfo
- LogoutButton
- DeleteAccountLink

### Local / View State
- user

### API / Data
- POST /auth/logout

### Analytics Events
- account_settings_viewed
- logout_tapped

### Validation
- 없음

### Edge Cases
- logout fail

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
탈퇴는 destructive 섹션.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- logout 성공 시 auth clear
- delete는 S66

---

## S62 — Daily Goal Setting

### Purpose
일일 목표 변경

### Entry
- S60

### Exit
- S60

### Components
- GoalRadioCards
- SaveButton

### Local / View State
- dailyGoal
- dirty

### API / Data
- PATCH /onboarding/profile

### Analytics Events
- daily_goal_settings_viewed
- daily_goal_changed

### Validation
- 10/20/30/50

### Edge Cases
- save fail

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
현재 선택 표시.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 저장 전까지 서버값 유지
- 성공 toast

---

## S63 — Notifications

### Purpose
푸시 종류별 동의 관리

### Entry
- S60

### Exit
- S60

### Components
- MasterToggle
- ReviewToggle
- EveningToggle
- StreakToggle
- SystemPermissionCTA

### Local / View State
- permission
- preferences

### API / Data
- PATCH /users/notification-preferences

### Analytics Events
- notification_settings_viewed
- notification_preference_changed

### Validation
- OS permission 상태 존중

### Edge Cases
- permission denied
- OS settings required

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
마스터 off 시 하위 옵션 시각적으로 disable.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 앱 설정과 OS 권한 차이 설명
- deep-link 가능 시 제공

---

## S64 — Subscription

### Purpose
구독 상태/관리

### Entry
- S60

### Exit
- S50/S52

### Components
- PlanStatus
- ExpiryDate
- ManageSubscriptionButton
- RestoreButton

### Local / View State
- subscription

### API / Data
- GET /subscription/status
- RevenueCat customer center or store manage

### Analytics Events
- subscription_settings_viewed

### Validation
- 없음

### Edge Cases
- status sync delay

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
취소 버튼을 숨기지 않는다.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 현재 상태 정확
- 스토어 관리로 이동
- restore 가능

---

## S65 — Legal

### Purpose
약관/개인정보/오픈소스 정보

### Entry
- S60/S50

### Exit
- back

### Components
- LegalList

### Local / View State
- none

### API / Data
- 없음

### Analytics Events
- legal_viewed

### Validation
- 없음

### Edge Cases
- webview load fail

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
가능하면 앱 내 텍스트/신뢰 가능한 webview.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 약관/개인정보 접근 가능
- 뒤로가기

---

## S66 — Delete Account

### Purpose
계정 영구 삭제 확인

### Entry
- S61

### Exit
- S04/S61

### Components
- WarningText
- ConfirmationCheckbox
- TypeConfirmation(optional)
- DeleteButton
- CancelButton

### Local / View State
- confirmed
- loading

### API / Data
- DELETE /users/me

### Analytics Events
- account_delete_viewed
- account_delete_confirmed
- account_delete_failed

### Validation
- 명시적 확인

### Edge Cases
- subscription active
- network fail
- server reject

### Loading / Empty / Error
- Loading: 네트워크 의존성이 있으면 CTA 중복 방지와 명확한 progress를 제공한다.
- Empty: 데이터가 없을 때 “오류”처럼 보이지 않도록 다음 행동을 제공한다.
- Error: 입력/학습 진행을 가능한 한 보존하고 retry를 제공한다.

### Layout / Interaction Notes
destructive red는 최종 CTA에만.

### Accessibility
- 주요 interactive element 44pt 이상
- Screen reader label 제공
- 색상만으로 상태 전달 금지
- Dynamic Type / keyboard overlap 확인

### Acceptance Criteria
- 취소 쉬움
- 삭제 전 영향 설명
- 성공 시 local data clear + S02/S04

---
