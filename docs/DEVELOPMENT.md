# 개발 환경

기획 원본은 그대로 유지합니다. 구현은 BUILD_PLAN.md의 순서를 따릅니다.

## 실행

Node 24 LTS와 npm 11 사용을 권장합니다.

```sh
npm ci
npm run dev
```

- 모바일: Expo 개발 서버, http://localhost:8081 (터미널에서 w로 웹 미리보기)
- API: http://localhost:3001/health
- 관리자: http://localhost:3000

각각 실행하려면 `npm run dev:mobile`, `npm run dev:api`, `npm run dev:admin`을 사용합니다.
웹 미리보기는 모바일 UI 개발 확인용이며 별도 웹 학습 제품이 아닙니다.

실제 휴대폰에서는 `apps/mobile/.env.example`을 `.env`로 복사하고 `EXPO_PUBLIC_API_URL`에 개발 컴퓨터의 LAN 주소를 지정합니다. API도 `HOST=0.0.0.0 npm run dev:api`로 실행해야 합니다. 기본 API는 로컬 컴퓨터에서만 접근할 수 있습니다.

## 검증

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## 데이터베이스 준비

Docker가 설치된 환경에서 루트 `.env.example`을 `.env`로 복사하고 로컬 비밀번호를 지정한 뒤 실행합니다.

```sh
npm run infra:up
```

PostgreSQL과 Redis는 로컬 인터페이스에만 노출합니다. 데이터 삭제 없는 종료는 `npm run infra:down`입니다. Prisma 인증 스키마와 마이그레이션을 포함합니다. `/health`는 API 프로세스 생존 확인이며 DB 준비 상태를 보장하지 않습니다.

## 구조와 경계

- apps/mobile: Expo Router와 TanStack Query 기반 모바일 앱
- apps/api: NestJS API
- apps/admin: Next.js 관리자 앱 실행 기반
- packages/ui: 공통 semantic 디자인 토큰
- packages/types: 공통 계약
- packages/config: 공통 TypeScript 설정
- packages/analytics: 공급자를 교체할 수 있는 이벤트 wrapper. 어댑터 연결 전에는 외부 전송 없음
- packages/learning-engine: 순수 학습 함수 전용 위치. 알고리즘은 아직 없음

이메일 가입과 로그인 화면을 API에 연결했습니다. 학습 데이터, 유료 구독, PostHog, Sentry는 아직 연결하지 않았습니다.

## 다음 단계

Phase 2 콘텐츠 모델과 관리자 CRUD는 구현했습니다. 관리자 접속과 운영 절차는 PHASE_2.md를 참고하세요. 다음은 Phase 3 온보딩입니다. Phase 1의 소셜 인증과 출시 준비 잔여 사항은 IMPLEMENTATION_STATUS.md에서 추적합니다.

## Phase 1 실행 환경 (2026-10-04)

이 컴퓨터에는 Homebrew PostgreSQL 17을 설치했습니다. 프로젝트 전용 데이터는 `.local/postgres`에 있으며 시스템 로그인 자동 시작 서비스는 등록하지 않았습니다. 개발 DB는 `lingoloop`, 테스트 DB는 `lingoloop_test`입니다. 접속 정보와 JWT secret은 각각 `.env`, `.env.test`에 저장하고 Git에서 제외합니다. 공개 파일로 복사하지 마세요.

PostgreSQL 다시 시작:

```sh
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D .local/postgres -l .local/postgres.log -o '-h 127.0.0.1 -p 55432' start
```

종료 (데이터 유지):

```sh
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D .local/postgres stop
```

새 환경에서는 `.env.example`을 참고하여 DATABASE_URL과 충분히 긴 무작위 JWT_SECRET을 설정한 뒤 실행합니다. Docker 방식도 계속 사용할 수 있습니다.

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run dev
```

통합 테스트는 `.env.test`의 별도 `lingoloop_test` DB에 먼저 마이그레이션을 적용한 뒤 `npm test`를 실행합니다. 테스트는 자신이 만든 무작위 이메일 계정만 정리합니다. 실제 개발 DB를 사용하면 테스트의 안전 검사가 실패합니다.

현재 앱의 가입은 개발용 이메일 계정입니다. Apple/Google, 메일 인증/복구, 정식 약관을 준비하기 전까지 production 실행을 차단합니다. 화면에서 실제 비밀번호를 재사용하지 마세요. 웹 sessionStorage는 개발 미리보기 전용이며 브라우저 탭을 닫으면 없어집니다. 네이티브는 SecureStore를 사용합니다.

Expo Router 경로는 모바일 AGENTS.md에 맞춰 `apps/mobile/src/app`으로 이동했습니다. 기존 Expo 서버가 실행 중이었다면 재시작해야 합니다.
