# Supabase Backend Setup

이 프로젝트는 Supabase 설정값이 있으면 실제 회원가입/로그인/DB를 쓰고, 설정값이 없으면 기존 localStorage 데모 모드로 계속 작동합니다.

## 1. Database 만들기

1. Supabase Dashboard에서 프로젝트를 엽니다.
2. 왼쪽 메뉴의 SQL Editor로 갑니다.
3. `supabase/schema.sql` 내용을 붙여넣고 Run 합니다.

이 SQL은 다음을 만듭니다.

- `app_users`: 학생/상담사 계정 프로필
- `student_profiles`: 목표대학, 성적, 생활기록부, 자소서, 로드맵, 과제
- `consultation_requests`: 상담 신청
- `counseling_journals`: 상담 일지
- RLS 정책: 학생은 자기 데이터만, 상담사는 학생 데이터를 볼 수 있게 설정

이미 예전 SQL을 실행했다면 `supabase/patches/20260517_lock_counselor_signup.sql`도 한 번 실행하세요. 상담사 가입은 기본 초대 코드 `topclass-counselor-2026`이 있어야 counselor 권한으로 생성되고, 상담사가 학생 상세 페이지에서 학생 정보를 수정할 수 있는 RLS 정책도 함께 적용됩니다.

## 2. Frontend 환경변수

Supabase Dashboard에서 Project Settings > API로 이동해 아래 값을 복사합니다.

- Project URL
- anon public key

프로젝트 루트에 `.env.local`을 만들고 아래처럼 넣습니다.

```bash
VITE_SUPABASE_URL=https://htgtbthofjijjbhwnone.supabase.co
VITE_SUPABASE_ANON_KEY=여기에-anon-public-key
VITE_COUNSELOR_INVITE_CODE=topclass-counselor-2026
```

`service_role` 키는 절대 `.env.local`, 프론트 코드, GitHub에 넣지 마세요.

학생/상담사 모두 비밀번호는 Supabase Auth 기본 정책에 맞춰 최소 6자 이상이어야 합니다.

## 3. 테스트 중 이메일 확인 끄기

빠른 학생/상담사 테스트 중에는 Supabase Dashboard > Authentication > Providers > Email에서 confirm email을 끄면 회원가입 직후 바로 로그인됩니다.

나중에 실제 서비스로 바꿀 때는 이메일 확인을 다시 켜고 Site URL/Redirect URL을 Vercel 주소로 설정하세요.

## 4. AI 에이전트 Edge Function

진짜 AI 분석은 `supabase/functions/ai-analysis`에 있습니다. Supabase CLI 설치 후:

```bash
supabase login
supabase link --project-ref htgtbthofjijjbhwnone
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy ai-analysis
```

선택적으로 모델을 바꾸려면:

```bash
supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

이 함수는 생활기록부/자소서/전략 데이터를 받아 입학사정관 관점으로 JSON 분석을 돌려줍니다. OpenAI 키는 Supabase 서버에만 저장되고 브라우저에는 노출되지 않습니다.

## 5. 실행

```bash
npm run dev
```

Supabase 환경변수가 있으면 실제 백엔드 모드, 없으면 데모 모드입니다.
