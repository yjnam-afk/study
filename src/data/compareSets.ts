// 시험 단골 "비교 세트" — 서로 견주며 외우면 좋은 개념들을 나란히 묶었다.
// 각 item.name 은 /explain 의 AI 설명으로 바로 연결된다(데이터 토픽 유무와 무관).
export type CompareItem = { name: string; hint: string };
export type CompareSet = {
  category: string;
  title: string; // 비교 주제
  axis: string; // 무엇을 기준으로 갈리는지 한 줄
  items: CompareItem[];
};

export const compareSets: CompareSet[] = [
  // ── 소프트웨어공학 ──────────────────────────────
  {
    category: "소프트웨어공학",
    title: "개발방법론",
    axis: "요구 변화 대응 vs 문서·계획 비중",
    items: [
      { name: "폭포수 모델", hint: "순차·문서 많음, 변경 취약" },
      { name: "프로토타입 모델", hint: "시제품으로 요구 확정" },
      { name: "나선형 모델", hint: "위험분석 중심 반복" },
      { name: "애자일 방법론", hint: "짧은 반복·변화 수용" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "애자일 실천법",
    axis: "반복(Sprint) vs 흐름(Flow) vs 기술 실천",
    items: [
      { name: "스크럼(Scrum)", hint: "고정 스프린트·역할" },
      { name: "칸반(Kanban)", hint: "WIP 제한·연속 흐름" },
      { name: "XP(익스트림 프로그래밍)", hint: "TDD·페어·리팩터링" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "아키텍처 스타일",
    axis: "배포 단위·결합도·확장 방식",
    items: [
      { name: "모놀리식 아키텍처", hint: "단일 배포·강결합" },
      { name: "SOA", hint: "ESB 기반 서비스 재사용" },
      { name: "MSA(마이크로서비스)", hint: "독립 배포·느슨한 결합" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "테스트 관점",
    axis: "내부 구조를 보는가 vs 입출력만 보는가",
    items: [
      { name: "화이트박스 테스트", hint: "코드·경로 커버리지" },
      { name: "블랙박스 테스트", hint: "명세 기반 입출력" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "좋은 모듈 설계",
    axis: "모듈 내부는 강하게, 모듈 간은 약하게",
    items: [
      { name: "응집도(Cohesion)", hint: "높을수록 좋음" },
      { name: "결합도(Coupling)", hint: "낮을수록 좋음" },
    ],
  },

  // ── 데이터베이스 ────────────────────────────────
  {
    category: "데이터베이스",
    title: "정규화 vs 반정규화",
    axis: "무결성 vs 조회 성능",
    items: [
      { name: "정규화(Normalization)", hint: "중복 제거·이상현상 방지" },
      { name: "반정규화(De-normalization)", hint: "중복 허용·조인 감소" },
    ],
  },
  {
    category: "데이터베이스",
    title: "RDB vs NoSQL",
    axis: "스키마·확장·일관성(CAP)",
    items: [
      { name: "관계형 DB(RDBMS)", hint: "정형 스키마·ACID" },
      { name: "NoSQL", hint: "유연 스키마·수평확장·BASE" },
    ],
  },
  {
    category: "데이터베이스",
    title: "OLTP vs OLAP",
    axis: "실시간 거래 처리 vs 대량 분석",
    items: [
      { name: "OLTP", hint: "짧은 트랜잭션·정규화" },
      { name: "OLAP", hint: "집계·다차원 분석·비정규화" },
    ],
  },
  {
    category: "데이터베이스",
    title: "동시성 제어(락)",
    axis: "충돌을 미리 막나 vs 커밋 시 검증하나",
    items: [
      { name: "비관적 락(Pessimistic Lock)", hint: "선점 잠금·대기" },
      { name: "낙관적 락(Optimistic Lock)", hint: "버전 검증·롤백" },
    ],
  },
  {
    category: "데이터베이스",
    title: "DW 스키마",
    axis: "차원 테이블 정규화 여부",
    items: [
      { name: "스타 스키마(Star Schema)", hint: "비정규화·조회 빠름" },
      { name: "스노우플레이크 스키마", hint: "차원 정규화·저장 절약" },
    ],
  },

  // ── 네트워크 ────────────────────────────────────
  {
    category: "네트워크",
    title: "참조 모델 계층",
    axis: "7계층 이론 vs 4계층 실무",
    items: [
      { name: "OSI 7계층", hint: "표준·계층별 역할 명확" },
      { name: "TCP/IP 4계층", hint: "인터넷 실제 구현" },
    ],
  },
  {
    category: "네트워크",
    title: "TCP vs UDP",
    axis: "신뢰성 vs 속도",
    items: [
      { name: "TCP", hint: "연결형·순서보장·재전송" },
      { name: "UDP", hint: "비연결·빠름·손실 허용" },
    ],
  },
  {
    category: "네트워크",
    title: "스위치 계층(L2~L7)",
    axis: "무엇을 보고 스위칭하나",
    items: [
      { name: "L2 스위치", hint: "MAC 주소 기반" },
      { name: "L3 스위치", hint: "IP·라우팅 기능" },
      { name: "L4 스위치", hint: "포트·부하분산" },
      { name: "L7 스위치", hint: "URL·콘텐츠 기반" },
    ],
  },
  {
    category: "네트워크",
    title: "동적 라우팅 방식",
    axis: "이웃 거리 vs 전체 지도",
    items: [
      { name: "거리 벡터 라우팅(RIP)", hint: "홉 수·주기 광고" },
      { name: "링크 상태 라우팅(OSPF)", hint: "전체 토폴로지·SPF" },
    ],
  },

  // ── 보안 ────────────────────────────────────────
  {
    category: "보안",
    title: "대칭키 vs 비대칭키",
    axis: "속도 vs 키 관리·부인방지",
    items: [
      { name: "대칭키 암호화(AES)", hint: "빠름·키 배포 문제" },
      { name: "비대칭키 암호화(RSA)", hint: "공개/개인키·느림·서명" },
    ],
  },
  {
    category: "보안",
    title: "IDS vs IPS",
    axis: "탐지·경보 vs 실시간 차단",
    items: [
      { name: "IDS(침입탐지시스템)", hint: "탐지·알림, 우회 경로" },
      { name: "IPS(침입방지시스템)", hint: "인라인·즉시 차단" },
    ],
  },
  {
    category: "보안",
    title: "인증 vs 인가",
    axis: "너 누구야 vs 뭘 할 수 있어",
    items: [
      { name: "인증(Authentication)", hint: "신원 확인" },
      { name: "인가(Authorization)", hint: "권한 부여·접근 허용" },
    ],
  },
  {
    category: "보안",
    title: "접근통제 모델",
    axis: "누가 권한을 정하나",
    items: [
      { name: "DAC(임의적 접근통제)", hint: "소유자가 결정" },
      { name: "MAC(강제적 접근통제)", hint: "보안등급·정책 강제" },
      { name: "RBAC(역할기반 접근통제)", hint: "역할에 권한 부여" },
    ],
  },
  {
    category: "보안",
    title: "해시 vs 암호화 vs 인코딩",
    axis: "복호 가능한가·목적이 뭔가",
    items: [
      { name: "해시(Hash)", hint: "단방향·무결성" },
      { name: "암호화(Encryption)", hint: "양방향·기밀성" },
      { name: "인코딩(Encoding)", hint: "형식 변환·보안 아님" },
    ],
  },

  // ── 인공지능 ────────────────────────────────────
  {
    category: "인공지능",
    title: "머신러닝 학습 유형",
    axis: "정답(라벨)이 있나·보상으로 배우나",
    items: [
      { name: "지도학습(Supervised)", hint: "라벨 있음·분류/회귀" },
      { name: "비지도학습(Unsupervised)", hint: "라벨 없음·군집" },
      { name: "강화학습(Reinforcement)", hint: "보상·시행착오" },
    ],
  },
  {
    category: "인공지능",
    title: "딥러닝 신경망",
    axis: "공간(이미지) vs 순서(시퀀스) vs 병렬 어텐션",
    items: [
      { name: "CNN", hint: "이미지·합성곱·특징추출" },
      { name: "RNN", hint: "시계열·순차·장기의존 약점" },
      { name: "트랜스포머(Transformer)", hint: "셀프 어텐션·병렬" },
    ],
  },
  {
    category: "인공지능",
    title: "앙상블 기법",
    axis: "병렬로 분산 낮추기 vs 순차로 편향 줄이기",
    items: [
      { name: "배깅(Bagging)", hint: "병렬·분산↓ (랜덤포레스트)" },
      { name: "부스팅(Boosting)", hint: "순차·편향↓ (XGBoost)" },
    ],
  },

  // ── 디지털서비스 ────────────────────────────────
  {
    category: "디지털서비스",
    title: "클라우드 서비스 모델",
    axis: "어디까지 제공자가 관리하나",
    items: [
      { name: "IaaS", hint: "인프라 제공·OS부터 내가" },
      { name: "PaaS", hint: "플랫폼 제공·앱만 개발" },
      { name: "SaaS", hint: "완성 SW·바로 사용" },
    ],
  },
  {
    category: "디지털서비스",
    title: "가상화 방식",
    axis: "OS 통째 vs 프로세스 격리",
    items: [
      { name: "가상머신(VM)", hint: "하이퍼바이저·게스트 OS" },
      { name: "컨테이너(Docker)", hint: "OS 커널 공유·가벼움" },
    ],
  },

  // ── 프로젝트관리 / 경영전략 ─────────────────────
  {
    category: "프로젝트관리",
    title: "감리 vs PMO",
    axis: "독립적 점검 vs 상시 지원",
    items: [
      { name: "정보시스템 감리", hint: "제3자·독립·시점 점검" },
      { name: "PMO", hint: "내부·상시·프로젝트 지원" },
    ],
  },
  {
    category: "프로젝트관리",
    title: "일정 기법(CPM vs PERT)",
    axis: "확정 소요시간 vs 확률적 추정",
    items: [
      { name: "CPM(주공정법)", hint: "확정 시간·임계경로" },
      { name: "PERT", hint: "3점 추정·확률 일정" },
    ],
  },
];
