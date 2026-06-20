# 정보관리기술사 학습 앱

정보관리기술사 시험 대비를 위한 AI 학습 웹앱입니다. Next.js(App Router) + TypeScript + Tailwind CSS로 만들어졌고, 무료 AI(Google Gemini / Groq)를 연동합니다.

## 주요 기능 (4개 메뉴)

| 메뉴 | 경로 | 설명 |
| --- | --- | --- |
| 📝 답안지 생성 | `/answer` | 1교시(용어형)·2교시(서술형) 문제에 대한 시험 답안지를 AI가 작성 |
| 💡 토픽 설명 | `/explain` | 어려운 토픽을 비유와 도식으로 이해하기 쉽게 설명 (눈높이 선택) |
| 🧠 암기 | `/memorize` | 토픽 기반 플래시카드 + 4지선다 퀴즈 생성 |
| 🔁 회독 관리 | `/review` | 토픽별 회독 횟수·진도 기록 (3회독 시 완료, 브라우저 저장) |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. AI API 키 설정 (무료)

`.env.example`을 복사해 `.env.local`을 만들고 키를 채웁니다.

```bash
cp .env.example .env.local
```

**추천: Google Gemini 무료 등급**
1. https://aistudio.google.com/apikey 에서 무료 API 키 발급
2. `.env.local`에 `GEMINI_API_KEY=발급받은키` 입력

**대안: Groq 무료 등급** (속도가 빠른 Llama 모델)
1. https://console.groq.com/keys 에서 무료 API 키 발급
2. `.env.local`에서 `AI_PROVIDER=groq`, `GROQ_API_KEY=발급받은키` 입력

> AI 제공자는 `src/lib/ai.ts`에서 추상화되어 있어 다른 모델로 쉽게 교체할 수 있습니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인합니다.

## 구조

```
src/
├─ app/
│  ├─ page.tsx              # 홈 (메뉴 4개)
│  ├─ answer/page.tsx       # 답안지 생성
│  ├─ explain/page.tsx      # 토픽 설명
│  ├─ memorize/page.tsx     # 플래시카드 · 퀴즈
│  ├─ review/page.tsx       # 회독 관리
│  └─ api/                  # 서버 라우트 (API 키는 서버에서만 사용)
│     ├─ answer/route.ts
│     ├─ explain/route.ts
│     ├─ flashcards/route.ts
│     └─ quiz/route.ts
├─ lib/
│  ├─ ai.ts                 # AI 제공자 추상화 (Gemini/Groq)
│  ├─ prompts.ts            # 기술사 시험 특화 프롬프트
│  └─ storage.ts            # 회독 진도 (localStorage)
├─ components/              # 공용 UI
└─ data/
   ├─ topics.json           # 샘플 토픽
   └─ questions.json        # 샘플 기출 문제
```

## 콘텐츠 확장

`src/data/topics.json`과 `src/data/questions.json`에 항목을 추가하면 추천 토픽/샘플 문제가 늘어납니다.

## 참고
- AI 응답은 학습 참고용이며 실제 채점 기준과 다를 수 있습니다.
- API 키는 서버 측 라우트에서만 사용되어 클라이언트에 노출되지 않습니다.
