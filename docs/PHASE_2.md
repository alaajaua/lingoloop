# Phase 2: 콘텐츠 모델과 관리자

## 구현 범위

모바일 Screen ID는 변경하지 않았습니다. Next.js 관리자에서 이메일 로그인, 목록, 20개 단위 페이지, 검색, 상태 필터, 단어/의미/예문 등록 및 편집, 상태 전환, 변경 이력을 제공합니다.

API:

- GET /admin/me
- GET /admin/words?q=&status=&page=
- GET /admin/words/:id
- POST /admin/words
- PATCH /admin/words/:id
- POST /admin/words/:id/status
- GET /admin/words/:id/history
- POST /admin/word-import/preview
- POST /admin/word-import/commit

Prisma: UserRole, Word, WordMeaning, Example, ContentStatus, ContentAudit. 마이그레이션 `202610040002_content`를 개발/테스트 DB에 적용했습니다.

## 데이터와 상태 규칙

- 신규 사용자 role은 learner. 요청 body로 권한을 올릴 수 없습니다.
- 모든 관리자 API는 서버 DB의 최신 role을 확인합니다. 권한 회수는 기존 JWT에도 즉시 적용됩니다.
- Word 단위로 의미와 예문을 하나의 트랜잭션에서 저장합니다. 편집 시 기존 ID는 유지하고 명시적으로 제거한 하위 항목만 삭제합니다.
- 이번 단계에서 게시 상태는 Word가 결정합니다. Example에는 별도 상태를 두지 않아 의미/예문 일부만 게시되는 상황을 피합니다. 학습 API 구현 시 부모 Word.status=published를 반드시 조건에 포함해야 합니다.
- 수정과 상태 전환은 revision을 필수로 받습니다. 다른 편집이 먼저 저장되면 409를 반환하고 UI 입력을 유지합니다.
- 수정은 draft에서만 가능합니다. published → draft는 게시 해제로 취급합니다.
- draft → review: 모든 의미에 예문 필요, 영어 문장에 정답 형태 포함 필요.
- review → published: 모든 예문의 설명과 HTTPS 오디오 URL 또는 앱에 등록된 음성 파일 추가 필요. UI에서 운영자의 검토 확인 후 요청합니다.
- 삭제 UX는 Word의 archived 상태 전환입니다. archived → draft로 되돌릴 수 있습니다.
- 등록/수정/상태 전환의 작업자 ID, 시각, revision을 기록합니다. 이력은 전체 내용 스냅샷이나 복원 기능이 아닙니다.
- 관리자 토큰은 메모리에만 둡니다. 새로고침 시 재로그인이 필요합니다. 저장하지 않은 편집은 새로고침/이탈 경고를 표시합니다.

## 관리자 접속

먼저 모바일 개발 화면에서 이메일 테스트 계정을 만든 뒤 로컬 터미널에서 해당 계정에 권한을 부여합니다. 사용자가 지정한 계정에는 후속 요청에 따라 관리자 권한을 부여했습니다.

```sh
npm run admin:role -- grant 가입한이메일
```

회수:

```sh
npm run admin:role -- revoke 가입한이메일
```

이 도구는 localhost 개발 DB만 허용합니다. 관리자 화면은 http://localhost:3000, API는 http://localhost:3001입니다. API 주소가 다르면 `NEXT_PUBLIC_API_URL`을 설정합니다.

## 검증 결과

- lint, 7개 패키지 typecheck, 3개 앱 build 통과
- 총 테스트 8개 통과. 인증과 health 기존 테스트 유지
- PostgreSQL 콘텐츠 통합 테스트: 미인증 401, 일반 사용자 403, 권한 상승 요청 무시, 게시 단계 건너뛰기 차단, 게시 조건 부족 거절, 기존 의미/예문 ID 유지, 잘못된 ID 변경 전체 rollback, 동시 수정 1건 성공/1건 409, 상태별 검색, 감사 이력, 보관 및 권한 회수 확인
- 브라우저: 관리자 로그인 → 의미/예문 포함 초안 저장 → 검토 전환과 입력 잠금 → 한국어 의미 검색 → 저장한 내용 재조회 → 보관 → 로그아웃 확인
- 검증용으로 만든 관리자 계정 1개와 테스트 단어 1개는 정리했습니다. 실제 학습 콘텐츠는 추가하지 않았습니다.

## 남은 경계

- 오디오 URL의 형식과 필수 여부만 검사합니다. 실제 파일 존재, 재생 가능성, 저작권은 운영자 검토가 필요합니다.
- 실제 검수된 1,500~3,000개 학습 콘텐츠, 오디오 업로드/생성, AI 콘텐츠 초안 생성은 아직 없습니다.
- 독립된 2인 검수 승인 체계와 내용별 버전 복원은 범위 밖입니다.
- 모바일 전체 E2E와 실제 iOS/Android 기기 검증은 이번 단계에서 실행하지 않았습니다.
- 기존 Phase 1의 소셜 로그인, 이메일 확인/복구, 정식 약관과 production 차단 조건은 유지합니다.
- 관리자 analytics 이벤트는 원문 명세에 정의되어 있지 않아 외부 이벤트를 추가하지 않았습니다. 변경 추적은 DB 감사 이력을 사용합니다.

다음: Phase 3, 학습 목표/자기평가 수준/하루 목표 저장과 S10~S13 연결.

## CSV/TSV 대량 등록 확장

[사용 안내](BULK_IMPORT.md). ContentImport 모델과 `202610040003_content_import` 마이그레이션을 개발/테스트 DB에 적용했습니다.

- UTF-8 CSV/TSV 최대 500행, 1MiB. 미리보기 후 정상 행만 초안 등록
- 기존 단어와 파일 내부 중복 제외, 기존 데이터 덮어쓰기 없음
- 동일 요청 재시도 중복 방지, 미리보기 변경 감지, 저장 실패 시 전체 취소
- 추가 테스트: CSV 구문과 경계값, 권한, 중복, 동시 재시도, 오래된 미리보기, 100KiB 초과 요청, 저장 중 실패 rollback
- 브라우저에서 파일 업로드 → 정상 1행/오류 1행 미리보기 → 1개 초안 저장과 1행 제외 확인. DB 저장 상태도 확인 후 해당 검증용 계정과 단어만 정리
