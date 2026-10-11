# GPT-6 Astra 시작 프롬프트

이 폴더는 Project LingoLoop라는 개인화 영어 어휘 학습 앱의 MVP 개발 프로젝트다.

먼저 아래 문서를 순서대로 읽어라.

1. `README.md`
2. `ASTRA_INSTRUCTIONS.md`
3. `docs/PRD.md`
4. `docs/IA.md`
5. `docs/TECHNICAL_SPEC.md`
6. `docs/SCREEN_SPEC.md`
7. `docs/DESIGN_SYSTEM.md`
8. `docs/WIREFRAME.md`
9. `BUILD_PLAN.md`

그 다음 바로 코딩하지 말고 현재 저장소 상태를 확인한 후,
문서와 실제 코드 상태를 비교해서 가장 첫 번째로 필요한 구현 단계를 결정하라.

프로젝트가 비어 있다면 `BUILD_PLAN.md`의 Phase 0부터 시작한다.

기술 기준:

- Turborepo
- Expo React Native + TypeScript
- NestJS + TypeScript
- PostgreSQL
- Prisma
- Redis
- Next.js Admin
- TanStack Query
- Zustand
- RevenueCat
- PostHog
- Sentry

가장 중요한 제품 루프:

```text
Question
→ Attempt
→ Mastery
→ SRS
→ Recommendation
→ Next Question
```

정답 제출 시 핵심 무결성:

```text
Attempt
→ Mastery
→ SRS
→ Session
→ Daily Progress
→ XP
→ Streak
```

서버를 학습 상태의 Source of Truth로 유지한다.

MVP 범위 밖 기능을 임의로 추가하지 않는다.

각 Vertical Slice마다:
1. 구현할 Screen ID/API를 명시
2. 필요한 schema/type 수정
3. API 구현
4. UI 구현
5. analytics 연결
6. test 추가
7. lint/typecheck/test 실행
8. 수정 파일과 남은 리스크 요약

이제 저장소를 점검하고 Phase 0 또는 현재 상태에 맞는 다음 단계부터 구현을 시작하라.
