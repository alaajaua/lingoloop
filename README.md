# Project LingoLoop — GPT-6 Astra 개발 패키지

이 폴더는 GPT-6 Astra를 중심으로 Project LingoLoop MVP를 실제 구현하기 위한 기준 문서 모음이다.

## 문서 구조

| 파일 | 목적 |
|---|---|
| `PRD.md` | 무엇을 만들지 정의 |
| `IA.md` | 화면 구조와 User Flow |
| `TECHNICAL_SPEC.md` | DB/API/기술 구조 |
| `SCREEN_SPEC.md` | 화면별 구현 명세 |
| `DESIGN_SYSTEM.md` | UI/UX 디자인 시스템 |
| `WIREFRAME.md` | 저충실도 화면 구조 |
| `ASTRA_INSTRUCTIONS.md` | GPT-6 Astra 작업 규칙 |
| `BUILD_PLAN.md` | 실제 개발 순서 |
| `START_PROMPT.md` | 새 Astra 작업에서 바로 붙여넣을 시작 프롬프트 |

## MVP 핵심

```text
Question
→ Attempt
→ Mastery
→ SRS
→ Recommendation
→ Next Question
```

리텐션 루프:

```text
Attempt
→ XP
→ Daily Goal
→ Streak
→ Return
```

## 기술 기준

- Expo React Native
- TypeScript
- NestJS
- PostgreSQL
- Prisma
- Redis
- Next.js Admin
- Turborepo
- RevenueCat
- PostHog
- Sentry

## Astra에서 작업할 때

전체 앱을 한 번에 만들지 않는다.

```text
문서 확인
→ 한 Vertical Slice 선택
→ DB/API
→ UI
→ Analytics
→ Test
→ 검증
→ 다음 Slice
```

첫 작업은 `START_PROMPT.md`를 기준으로 시작한다.
