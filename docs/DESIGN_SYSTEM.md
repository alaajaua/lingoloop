# Design System — Project LingoLoop

## 1. Design Direction

목표는 “공부 앱”보다 **가벼운 인터랙티브 학습 도구**처럼 느껴지게 하는 것이다.

공개된 말해보카 UX에서 벤치마킹하는 것은 다음 원리다.

- 퀴즈 중심의 짧은 학습
- 개인화된 홈
- 즉시 피드백
- 시각적으로 분명한 진행률
- 학습 통계의 가시화
- 게임형 보상과 꾸준함 강화

그러나 시각적 결과물은 독자적으로 설계한다.

---

# 2. Design Principles

## P1. One Primary Action
한 화면에서 가장 중요한 행동은 하나만 강하게 보인다.

## P2. Learning First
장식보다 문제와 답변이 중심이다.

## P3. Calm Gamification
과도한 카지노식 보상/번쩍임 없이 “성취감”에 집중한다.

## P4. Friendly, Not Childish
성인도 편하게 사용할 수 있는 친근함.

## P5. Fast Feedback
정답 제출 후 상태 변화가 명확해야 한다.

## P6. State Is Visible
진행률, due review, streak, mastery가 숨지 않는다.

---

# 3. Brand Personality

Keywords:

- Clear
- Energetic
- Warm
- Focused
- Smart
- Modern

피해야 할 방향:

- 유아용 교육앱 느낌
- 네온 게임 UI
- 과도한 3D
- 말해보카 고유 캐릭터 유사 스타일
- Duolingo 복제형 마스코트

---

# 4. Color Tokens

구체 색상은 독자적 방향.

```ts
colors = {
  brand: {
    50:  "#F3F7FF",
    100: "#E5EDFF",
    500: "#506BFF",
    600: "#3E56E8",
    700: "#3144C2"
  },
  accent: {
    500: "#FFB547"
  },
  success: {
    50: "#ECFDF5",
    500: "#20A66A",
    700: "#147A4C"
  },
  error: {
    50: "#FFF1F2",
    500: "#E44D61",
    700: "#B83247"
  },
  warning: {
    500: "#EBA83A"
  },
  neutral: {
    0: "#FFFFFF",
    50: "#F8F9FC",
    100: "#F0F2F7",
    300: "#CDD2DF",
    500: "#7B8394",
    700: "#454B59",
    900: "#171A21"
  }
}
```

주의: 구현에서는 semantic token을 사용한다.

```text
bg.default
bg.subtle
text.primary
text.secondary
border.default
action.primary
feedback.success
feedback.error
```

---

# 5. Typography

추천 시스템 폰트 우선:

- iOS: SF Pro
- Android: Pretendard 또는 system fallback

Scale:

| Token | Size | Weight | Use |
|---|---:|---:|---|
| display | 32 | 700 | 결과 핵심 숫자 |
| h1 | 28 | 700 | 화면 제목 |
| h2 | 22 | 700 | 카드/섹션 |
| h3 | 18 | 600 | 소제목 |
| body | 16 | 400 | 일반 텍스트 |
| bodyStrong | 16 | 600 | 중요 설명 |
| caption | 13 | 400 | 보조 |
| button | 16 | 700 | CTA |

Line height: 1.35–1.55.

---

# 6. Spacing

4pt grid.

```text
xs  = 4
sm  = 8
md  = 12
lg  = 16
xl  = 24
2xl = 32
3xl = 48
```

Screen horizontal padding: `20`.

---

# 7. Radius

```text
sm = 8
md = 12
lg = 16
xl = 24
pill = 999
```

Question/feedback cards: 20–24 권장.

---

# 8. Elevation

Flat-first.

- default cards: border, no shadow
- floating sheet: subtle shadow
- primary CTA: no heavy shadow
- do not use neumorphism

---

# 9. Primary Button

Height: 52
Radius: 16
Full-width by default

States:
- default
- pressed
- disabled
- loading

Copy:
- “오늘 학습 시작”
- “확인”
- “다음”

한 화면에 Primary 2개 금지.

---

# 10. Secondary Button

- neutral fill 또는 outline
- CTA hierarchy 명확

예:
- “조금 더 공부하기”
- “나중에”

---

# 11. Answer Input

Learning surface에서 핵심.

Specs:
- min height 56
- 18–20px input text
- auto focus
- submit button keyboard-aware
- answer 제출 후 lock
- error border만으로 상태 전달하지 않음

---

# 12. Progress Bar

Learning session 상단:

- thin 6–8px
- animated progress
- 숫자 `12 / 20` 보조
- reduce-motion에서는 즉시 변경

---

# 13. Question Card

구성:

```text
Context label (optional)
English sentence
Korean cue
Input
Hint
```

영문 target blank는 충분히 길게.

---

# 14. Feedback Surface

정답/오답 모두 같은 구조를 유지.

```text
Status icon + title
Correct answer
Short explanation
Full example
Audio
Next CTA
```

Correct는 success green, Wrong은 error red를 쓰되 배경은 아주 연하게.

---

# 15. Home Cards

홈은 dashboard가 아니라 “학습 시작 화면”.

Priority:

1. Today's Goal
2. Start CTA
3. Due reviews
4. Streak / level
5. Weekly snapshot

카드를 과다하게 쌓지 않는다.

---

# 16. Progress Visualization

허용:
- simple bars
- line
- progress ring
- status segmented bar

피해야 함:
- 3D charts
- 복잡한 radar chart
- 소수점 과다
- 의미 없는 경쟁 지표

---

# 17. Icons

- 일관된 outline icon set
- 20/24px grid
- emoji는 보상/상태에 제한적 사용
- 캐릭터 의존 금지

---

# 18. Motion

목적:
- 상태 전달
- 성취 강화
- 방향성

Allowed:
- 150–250ms button/feedback
- progress fill
- check pop
- subtle XP count

Avoid:
- 긴 confetti
- 강한 shake
- 매 문제 full-screen animation

Session complete에서만 짧은 celebration 허용.

---

# 19. Haptics

- correct: light success haptic
- wrong: very subtle notification
- goal complete: medium success

사용자 설정/OS reduce haptics 존중.

---

# 20. Tone & Copy

원칙:

- 짧고 자연스러운 한국어
- 실패를 비난하지 않음
- 과도한 아동어 금지
- “당신은 틀렸습니다” 금지

Examples:

Correct:
- “좋아요!”
- “정확해요.”
- “바로 맞혔어요.”

Wrong:
- “정답을 확인해볼게요.”
- “이 표현은 이렇게 써요.”
- “철자가 조금 달라요.”

---

# 21. Accessibility

- WCAG AA 수준 대비 목표
- 색 + 아이콘 + 텍스트
- 버튼 44×44 minimum
- Screen reader order
- Dynamic type
- input label
- audio has text alternative
- motion opt-out

---

# 22. Dark Mode

MVP P1로 미뤄도 되지만 token architecture는 처음부터 dark-ready.

하드코딩 색상 금지.

---

# 23. Responsive

Phone first.

Width breakpoints:
- compact: < 360
- standard: 360–430
- large phone: > 430

Tablet은 max-width learning surface 600–680px.

---

# 24. Design QA Checklist

- [ ] Primary CTA 하나
- [ ] 20px screen padding
- [ ] semantic tokens
- [ ] loading/error/empty state
- [ ] keyboard overlap 없음
- [ ] 44pt touch target
- [ ] screen reader labels
- [ ] reduce motion
- [ ] no proprietary benchmark assets
