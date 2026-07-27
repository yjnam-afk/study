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
  // ─────────────────────────── 소프트웨어공학 ───────────────────────────
  {
    category: "소프트웨어공학",
    title: "SW 개발방법론",
    axis: "무엇을 중심으로 시스템을 나누나",
    items: [
      { name: "구조적 방법론", hint: "기능(프로세스) 중심·DFD" },
      { name: "정보공학(IE) 방법론", hint: "데이터 중심·전사 관점" },
      { name: "객체지향 방법론", hint: "객체(데이터+기능) 캡슐화" },
      { name: "CBD(컴포넌트 기반 개발)", hint: "재사용 컴포넌트 조립" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "SDLC 프로세스 모델",
    axis: "요구 변화 대응 vs 계획·문서 비중",
    items: [
      { name: "폭포수 모델", hint: "순차·문서 많음, 변경 취약" },
      { name: "프로토타입 모델", hint: "시제품으로 요구 확정" },
      { name: "나선형(Spiral) 모델", hint: "위험분석 중심 반복" },
      { name: "반복적·증분형 모델", hint: "기능 조금씩 인도" },
      { name: "RAD 모델", hint: "짧은 기간·CASE 도구" },
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
    title: "객체지향 4대 특징",
    axis: "OOP를 지탱하는 핵심 개념",
    items: [
      { name: "캡슐화(Encapsulation)", hint: "데이터+기능 은닉" },
      { name: "상속(Inheritance)", hint: "부모 특성 재사용" },
      { name: "다형성(Polymorphism)", hint: "같은 호출·다른 동작" },
      { name: "추상화(Abstraction)", hint: "핵심만 모델링" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "테스트 관점(구조 vs 명세)",
    axis: "내부 구조를 보는가 vs 입출력만 보는가",
    items: [
      { name: "화이트박스 테스트", hint: "코드·경로 커버리지" },
      { name: "블랙박스 테스트", hint: "명세 기반 입출력" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "테스트 단계(V-모델)",
    axis: "무엇을 확인하는 단계인가",
    items: [
      { name: "단위 테스트", hint: "모듈 단위·화이트박스" },
      { name: "통합 테스트", hint: "인터페이스·모듈 결합" },
      { name: "시스템 테스트", hint: "전체·비기능 포함" },
      { name: "인수 테스트", hint: "사용자 요구 충족" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "통합 테스트 방식",
    axis: "어느 방향으로 모듈을 결합하나",
    items: [
      { name: "빅뱅 통합", hint: "한꺼번에·오류 격리 어려움" },
      { name: "하향식 통합", hint: "상위→하위, 스텁 사용" },
      { name: "상향식 통합", hint: "하위→상위, 드라이버 사용" },
      { name: "샌드위치 통합", hint: "상·하향 혼합" },
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
  {
    category: "소프트웨어공학",
    title: "CPU 스케줄링 방식",
    axis: "실행 중 CPU를 뺏을 수 있나",
    items: [
      { name: "선점형 스케줄링", hint: "RR·SRT·MLFQ, 응답성↑" },
      { name: "비선점형 스케줄링", hint: "FCFS·SJF·HRN, 문맥교환↓" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "CPU 스케줄링 알고리즘",
    axis: "무엇을 기준으로 다음 프로세스를 고르나",
    items: [
      { name: "FCFS", hint: "도착 순서·비선점" },
      { name: "SJF", hint: "짧은 작업 우선·기아 위험" },
      { name: "SRT", hint: "SJF의 선점형" },
      { name: "Round Robin", hint: "타임슬라이스·공평" },
      { name: "HRN", hint: "대기시간 반영·기아 완화" },
      { name: "MLFQ", hint: "다단계 피드백 큐" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "실시간 스케줄링(RM vs EDF)",
    axis: "우선순위를 고정하나 vs 마감으로 정하나",
    items: [
      { name: "RM(Rate Monotonic)", hint: "주기 짧을수록 우선·정적" },
      { name: "EDF(Earliest Deadline First)", hint: "마감 임박 우선·동적" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "동기화 기법(상호배제)",
    axis: "임계구역을 어떻게 보호하나",
    items: [
      { name: "뮤텍스(Mutex)", hint: "1개 자원·소유 개념" },
      { name: "세마포어(Semaphore)", hint: "카운터·다수 자원" },
      { name: "모니터(Monitor)", hint: "언어 차원 캡슐화·조건변수" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "교착상태(Deadlock) 해결",
    axis: "언제·어떻게 데드락을 다루나",
    items: [
      { name: "교착 예방(Prevention)", hint: "4대 조건 원천 차단" },
      { name: "교착 회피(Avoidance)", hint: "은행가 알고리즘" },
      { name: "교착 탐지(Detection)", hint: "자원할당 그래프" },
      { name: "교착 회복(Recovery)", hint: "프로세스·자원 강제 회수" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "페이지 교체 알고리즘",
    axis: "어떤 페이지를 내보낼지 고르는 기준",
    items: [
      { name: "FIFO", hint: "먼저 들어온 것·벨레이디 이상" },
      { name: "LRU", hint: "가장 오래 미참조" },
      { name: "LFU", hint: "참조 횟수 최소" },
      { name: "Optimal", hint: "미래 최장 미사용(이론상)" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "가상메모리 분할 방식",
    axis: "고정 크기 vs 논리 단위",
    items: [
      { name: "페이징(Paging)", hint: "고정 분할·내부 단편화" },
      { name: "세그먼테이션(Segmentation)", hint: "가변 분할·외부 단편화" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "캐시 사상(Mapping) 기법",
    axis: "메모리 블록을 캐시 어디에 놓나",
    items: [
      { name: "직접 사상(Direct)", hint: "고정 위치·단순·충돌↑" },
      { name: "연관 사상(Associative)", hint: "어디든·유연·비용↑" },
      { name: "집합연관 사상(Set-Associative)", hint: "절충안" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "캐시 쓰기 정책",
    axis: "메모리에 언제 반영하나",
    items: [
      { name: "Write-Through", hint: "즉시 반영·일관성↑·느림" },
      { name: "Write-Back", hint: "나중 반영·빠름·일관성 관리" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "디스크 스케줄링",
    axis: "헤드 이동을 어떻게 줄이나",
    items: [
      { name: "FCFS", hint: "요청 순서·단순" },
      { name: "SSTF", hint: "가까운 것 우선·기아" },
      { name: "SCAN", hint: "끝까지 왕복(엘리베이터)" },
      { name: "C-SCAN", hint: "한 방향·복귀 후 재시작" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "명령어 집합(CISC vs RISC)",
    axis: "명령어를 복잡하게 vs 단순하게",
    items: [
      { name: "CISC", hint: "복잡·가변길이·명령↓" },
      { name: "RISC", hint: "단순·고정길이·파이프라인" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "컴퓨터 구조(폰노이만 vs 하버드)",
    axis: "명령·데이터 메모리를 공유하나",
    items: [
      { name: "폰노이만 구조", hint: "메모리 공유·병목 존재" },
      { name: "하버드 구조", hint: "명령·데이터 분리·병렬" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "커널 구조",
    axis: "커널에 기능을 얼마나 넣나",
    items: [
      { name: "모놀리식 커널", hint: "전부 커널·빠름·큼" },
      { name: "마이크로 커널", hint: "최소 커널·안정·오버헤드" },
      { name: "유니커널(Unikernel)", hint: "앱+최소 OS 단일 이미지" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "병렬처리 Flynn 분류",
    axis: "명령·데이터 스트림 수",
    items: [
      { name: "SISD", hint: "단일 명령·단일 데이터" },
      { name: "SIMD", hint: "단일 명령·다중 데이터(GPU)" },
      { name: "MISD", hint: "다중 명령·단일 데이터(희소)" },
      { name: "MIMD", hint: "다중 명령·다중 데이터" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "I/O 제어 방식",
    axis: "CPU가 얼마나 개입하나",
    items: [
      { name: "Programmed I/O", hint: "CPU 폴링·비효율" },
      { name: "인터럽트 I/O", hint: "완료 시 통지" },
      { name: "DMA", hint: "CPU 없이 메모리 직접 전송" },
      { name: "채널 제어", hint: "전용 채널 프로세서" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "정렬 알고리즘",
    axis: "평균 시간복잡도·방식",
    items: [
      { name: "버블·삽입·선택 정렬", hint: "O(n²)·단순" },
      { name: "퀵 정렬", hint: "평균 O(n log n)·분할정복" },
      { name: "병합 정렬", hint: "O(n log n)·안정·추가공간" },
      { name: "힙 정렬", hint: "O(n log n)·제자리" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "탐색 트리(B계열)",
    axis: "데이터·포인터를 어디에 두나",
    items: [
      { name: "B-Tree", hint: "모든 노드에 키·데이터" },
      { name: "B+ Tree", hint: "리프에만 데이터·순차↑" },
      { name: "B* Tree", hint: "노드 사용률↑(2/3)" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "균형 트리(AVL vs 레드블랙)",
    axis: "얼마나 엄격히 균형을 잡나",
    items: [
      { name: "AVL 트리", hint: "엄격 균형·조회↑" },
      { name: "레드블랙 트리", hint: "느슨 균형·삽입·삭제↑" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "그래프 순회(DFS vs BFS)",
    axis: "깊이 먼저 vs 너비 먼저",
    items: [
      { name: "DFS(깊이 우선 탐색)", hint: "스택·재귀·경로 탐색" },
      { name: "BFS(너비 우선 탐색)", hint: "큐·최단 경로(무가중)" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "알고리즘 설계 기법",
    axis: "문제를 어떻게 쪼개·푸나",
    items: [
      { name: "분할정복", hint: "나눠서 풀고 합침(퀵·병합)" },
      { name: "동적계획법(DP)", hint: "중복 부분문제·메모이제이션" },
      { name: "그리디(탐욕법)", hint: "매 순간 최적 선택" },
      { name: "백트래킹", hint: "가지치기·되돌아가기" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "최단경로 알고리즘",
    axis: "음수 간선·범위 처리",
    items: [
      { name: "다익스트라", hint: "단일 출발·음수 불가" },
      { name: "벨만-포드", hint: "음수 간선 허용" },
      { name: "플로이드-와샬", hint: "모든 쌍 최단경로" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "디자인 패턴 3분류(GoF)",
    axis: "무엇을 다루는 패턴인가",
    items: [
      { name: "생성 패턴", hint: "객체 생성(싱글턴·팩토리)" },
      { name: "구조 패턴", hint: "구조 결합(어댑터·프록시)" },
      { name: "행위 패턴", hint: "책임·소통(옵서버·전략)" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "SW 규모·비용 산정",
    axis: "무엇을 근거로 규모를 재나",
    items: [
      { name: "LOC 기법", hint: "코드 라인 수·주관적" },
      { name: "기능점수(FP)", hint: "기능 관점·언어 무관" },
      { name: "COCOMO", hint: "LOC 기반 수학적 모델" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "유지보수 3R",
    axis: "기존 자산을 어떻게 다루나",
    items: [
      { name: "재사용(Reuse)", hint: "기존 모듈 활용" },
      { name: "역공학(Reverse)", hint: "코드→설계 복원" },
      { name: "재공학(Re-engineering)", hint: "재구조화·현대화" },
    ],
  },
  {
    category: "소프트웨어공학",
    title: "프로세스 vs 스레드",
    axis: "자원을 공유하나·독립인가",
    items: [
      { name: "프로세스(Process)", hint: "독립 메모리·문맥교환 무거움" },
      { name: "스레드(Thread)", hint: "메모리 공유·가벼움" },
    ],
  },

  // ─────────────────────────── 데이터베이스 ───────────────────────────
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
    title: "정규형 단계(1NF~BCNF)",
    axis: "어떤 종속성을 제거하나",
    items: [
      { name: "제1정규형(1NF)", hint: "원자값" },
      { name: "제2정규형(2NF)", hint: "부분함수 종속 제거" },
      { name: "제3정규형(3NF)", hint: "이행함수 종속 제거" },
      { name: "BCNF", hint: "결정자=후보키" },
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
    title: "DBMS 유형(관계·객체)",
    axis: "객체 개념을 얼마나 수용하나",
    items: [
      { name: "RDBMS", hint: "관계형·정형" },
      { name: "OODBMS", hint: "객체 저장·복잡 데이터" },
      { name: "ORDBMS", hint: "관계형+객체 확장" },
    ],
  },
  {
    category: "데이터베이스",
    title: "NoSQL 데이터 모델",
    axis: "무엇을 단위로 저장하나",
    items: [
      { name: "키-값 저장소", hint: "단순·빠름(Redis)" },
      { name: "문서 DB", hint: "JSON 문서(MongoDB)" },
      { name: "칼럼 패밀리", hint: "칼럼 기반(Cassandra)" },
      { name: "그래프 DB", hint: "관계 탐색(Neo4j)" },
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
    title: "SQL 언어 분류",
    axis: "무엇을 하는 명령인가",
    items: [
      { name: "DDL", hint: "정의(CREATE·ALTER·DROP)" },
      { name: "DML", hint: "조작(SELECT·INSERT·UPDATE)" },
      { name: "DCL", hint: "제어(GRANT·REVOKE)" },
      { name: "TCL", hint: "트랜잭션(COMMIT·ROLLBACK)" },
    ],
  },
  {
    category: "데이터베이스",
    title: "동시성 제어(락 방식)",
    axis: "충돌을 미리 막나 vs 커밋 시 검증하나",
    items: [
      { name: "비관적 락(2PL)", hint: "선점 잠금·대기" },
      { name: "낙관적 검증", hint: "버전 검증·롤백" },
      { name: "MVCC", hint: "다중 버전·읽기 무대기" },
    ],
  },
  {
    category: "데이터베이스",
    title: "트랜잭션 격리수준",
    axis: "동시성 이상현상을 어디까지 막나",
    items: [
      { name: "Read Uncommitted", hint: "Dirty Read 허용" },
      { name: "Read Committed", hint: "Dirty Read 방지" },
      { name: "Repeatable Read", hint: "Non-repeatable 방지" },
      { name: "Serializable", hint: "Phantom까지 방지·직렬" },
    ],
  },
  {
    category: "데이터베이스",
    title: "DB 회복 기법",
    axis: "무엇으로 복구 정보를 남기나",
    items: [
      { name: "로그 기반 회복", hint: "REDO·UNDO 로그" },
      { name: "체크포인트", hint: "회복 범위 축소" },
      { name: "그림자 페이징", hint: "페이지 복제·로그 불요" },
    ],
  },
  {
    category: "데이터베이스",
    title: "인덱스 유형",
    axis: "물리 정렬·저장 구조",
    items: [
      { name: "클러스터형 인덱스", hint: "물리 정렬·테이블당 1개" },
      { name: "비클러스터형 인덱스", hint: "별도 구조·다수 가능" },
      { name: "비트맵 인덱스", hint: "낮은 카디널리티·DW" },
    ],
  },
  {
    category: "데이터베이스",
    title: "DW 스키마(Star vs Snowflake)",
    axis: "차원 테이블 정규화 여부",
    items: [
      { name: "스타 스키마", hint: "비정규화·조회 빠름" },
      { name: "스노우플레이크 스키마", hint: "차원 정규화·저장 절약" },
    ],
  },
  {
    category: "데이터베이스",
    title: "확장 기법(파티셔닝 vs 샤딩)",
    axis: "한 DB 안 분할 vs 여러 DB로 분산",
    items: [
      { name: "파티셔닝(Partitioning)", hint: "단일 DB 내 테이블 분할" },
      { name: "샤딩(Sharding)", hint: "여러 노드로 수평 분산" },
    ],
  },
  {
    category: "데이터베이스",
    title: "CAP vs PACELC",
    axis: "분산 DB의 트레이드오프 모델",
    items: [
      { name: "CAP 이론", hint: "일관성·가용성·분단내성 중 2" },
      { name: "PACELC", hint: "분단 아닐 때 지연 vs 일관성" },
    ],
  },
  {
    category: "데이터베이스",
    title: "빅데이터 처리(Hadoop vs Spark)",
    axis: "디스크 기반 vs 인메모리",
    items: [
      { name: "Hadoop MapReduce", hint: "디스크·배치·안정" },
      { name: "Apache Spark", hint: "인메모리·빠름·스트리밍" },
    ],
  },
  {
    category: "데이터베이스",
    title: "빅데이터 아키텍처(Lambda vs Kappa)",
    axis: "배치+실시간 vs 실시간 단일",
    items: [
      { name: "람다 아키텍처", hint: "배치+스피드 이중 경로" },
      { name: "카파 아키텍처", hint: "스트림 단일 경로·단순" },
    ],
  },

  // ─────────────────────────── 네트워크 ───────────────────────────
  {
    category: "네트워크",
    title: "참조 모델(OSI vs TCP/IP)",
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
      { name: "거리 벡터(RIP)", hint: "홉 수·주기 광고" },
      { name: "링크 상태(OSPF)", hint: "전체 토폴로지·SPF" },
      { name: "경로 벡터(BGP)", hint: "AS 간·경로 속성" },
    ],
  },
  {
    category: "네트워크",
    title: "IPv4 vs IPv6",
    axis: "주소 길이·보안·자동설정",
    items: [
      { name: "IPv4", hint: "32비트·주소 고갈·NAT" },
      { name: "IPv6", hint: "128비트·IPSec 내장·자동설정" },
    ],
  },
  {
    category: "네트워크",
    title: "전송(캐스트) 방식",
    axis: "누구에게 보내나",
    items: [
      { name: "유니캐스트", hint: "1:1" },
      { name: "멀티캐스트", hint: "1:그룹" },
      { name: "브로드캐스트", hint: "1:전체" },
      { name: "애니캐스트", hint: "1:가장 가까운 하나" },
    ],
  },
  {
    category: "네트워크",
    title: "교환 방식(회선 vs 패킷)",
    axis: "전용 경로 vs 분할 전송",
    items: [
      { name: "회선 교환", hint: "전용 회선·지연 일정" },
      { name: "패킷 교환", hint: "분할·공유·효율" },
    ],
  },
  {
    category: "네트워크",
    title: "매체 접근 제어(CD vs CA)",
    axis: "충돌을 감지하나 vs 회피하나",
    items: [
      { name: "CSMA/CD", hint: "유선·충돌 감지" },
      { name: "CSMA/CA", hint: "무선·충돌 회피" },
    ],
  },
  {
    category: "네트워크",
    title: "오류 제어(FEC vs BEC)",
    axis: "스스로 정정 vs 재전송 요청",
    items: [
      { name: "FEC(전진 오류정정)", hint: "수신측 정정·재전송 없음" },
      { name: "BEC(후진, ARQ)", hint: "재전송 요구·오버헤드" },
    ],
  },
  {
    category: "네트워크",
    title: "ARQ 재전송 기법",
    axis: "무엇을 다시 보내나",
    items: [
      { name: "Stop-and-Wait", hint: "1개씩·비효율" },
      { name: "Go-Back-N", hint: "오류 이후 전부 재전송" },
      { name: "Selective Repeat", hint: "오류 프레임만 재전송" },
    ],
  },
  {
    category: "네트워크",
    title: "QoS 모델(IntServ vs DiffServ)",
    axis: "흐름별 예약 vs 클래스별 처리",
    items: [
      { name: "IntServ", hint: "RSVP·흐름별 예약·확장성↓" },
      { name: "DiffServ", hint: "DSCP·클래스 구분·확장성↑" },
    ],
  },
  {
    category: "네트워크",
    title: "저전력 광역 IoT(LPWAN)",
    axis: "대역·비면허 여부",
    items: [
      { name: "LoRa", hint: "비면허·장거리·저속" },
      { name: "SigFox", hint: "초협대역·초저전력" },
      { name: "NB-IoT", hint: "면허(LTE)·안정" },
      { name: "LTE-M", hint: "면허·중속·이동성" },
    ],
  },
  {
    category: "네트워크",
    title: "근거리 무선(WPAN)",
    axis: "거리·속도·용도",
    items: [
      { name: "블루투스", hint: "10m·기기 연결" },
      { name: "지그비(Zigbee)", hint: "저속·저전력·센서망" },
      { name: "UWB", hint: "초광대역·정밀 측위" },
      { name: "NFC", hint: "10cm·태그·결제" },
    ],
  },
  {
    category: "네트워크",
    title: "SDN vs NFV",
    axis: "제어 분리 vs 기능 가상화",
    items: [
      { name: "SDN", hint: "제어·데이터 평면 분리" },
      { name: "NFV", hint: "네트워크 기능 SW 가상화" },
    ],
  },
  {
    category: "네트워크",
    title: "다중화(Multiplexing)",
    axis: "무엇으로 채널을 나누나",
    items: [
      { name: "FDM", hint: "주파수 분할" },
      { name: "TDM", hint: "시간 분할" },
      { name: "WDM", hint: "파장 분할(광)" },
    ],
  },

  // ─────────────────────────── 보안 ───────────────────────────
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
    title: "블록 vs 스트림 암호",
    axis: "묶어서 vs 비트 단위로",
    items: [
      { name: "블록 암호", hint: "고정 블록·AES·DES" },
      { name: "스트림 암호", hint: "비트/바이트·빠름·RC4" },
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
  {
    category: "보안",
    title: "IDS vs IPS",
    axis: "탐지·경보 vs 실시간 차단",
    items: [
      { name: "IDS(침입탐지)", hint: "탐지·알림·우회 경로" },
      { name: "IPS(침입방지)", hint: "인라인·즉시 차단" },
    ],
  },
  {
    category: "보안",
    title: "침입탐지 방식",
    axis: "알려진 패턴 vs 정상 이탈",
    items: [
      { name: "오용(시그니처) 탐지", hint: "알려진 패턴·오탐↓·미탐↑" },
      { name: "이상(행위) 탐지", hint: "정상 이탈·신종 대응·오탐↑" },
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
      { name: "DAC(임의적)", hint: "소유자가 결정" },
      { name: "MAC(강제적)", hint: "보안등급·정책 강제" },
      { name: "RBAC(역할기반)", hint: "역할에 권한 부여" },
      { name: "ABAC(속성기반)", hint: "속성 조합·동적" },
    ],
  },
  {
    category: "보안",
    title: "보안 모델(기밀 vs 무결)",
    axis: "무엇을 지키는 모델인가",
    items: [
      { name: "Bell-LaPadula", hint: "기밀성·No Read Up/No Write Down" },
      { name: "Biba", hint: "무결성·No Write Up/No Read Down" },
      { name: "Clark-Wilson", hint: "무결성·잘 구성된 트랜잭션" },
    ],
  },
  {
    category: "보안",
    title: "사용자 인증 유형",
    axis: "무엇으로 본인을 증명하나",
    items: [
      { name: "지식 기반", hint: "비밀번호·PIN" },
      { name: "소유 기반", hint: "OTP·스마트카드" },
      { name: "존재(생체) 기반", hint: "지문·홍채·얼굴" },
      { name: "행위 기반", hint: "서명·걸음걸이" },
    ],
  },
  {
    category: "보안",
    title: "악성코드 유형",
    axis: "자기복제·숙주 여부",
    items: [
      { name: "바이러스", hint: "숙주 필요·감염" },
      { name: "웜(Worm)", hint: "자기복제·네트워크 전파" },
      { name: "트로이 목마", hint: "정상 위장·복제 안 함" },
    ],
  },
  {
    category: "보안",
    title: "사회공학 피싱 변종",
    axis: "무슨 매체·수법을 쓰나",
    items: [
      { name: "피싱(Phishing)", hint: "가짜 메일·사이트" },
      { name: "파밍(Pharming)", hint: "DNS 변조·정상주소" },
      { name: "스미싱(Smishing)", hint: "문자 메시지·URL" },
      { name: "큐싱(Qshing)", hint: "악성 QR코드" },
    ],
  },
  {
    category: "보안",
    title: "악성코드 분석(정적 vs 동적)",
    axis: "실행하지 않고 vs 실행하며",
    items: [
      { name: "정적 분석", hint: "코드·시그니처·미실행" },
      { name: "동적 분석", hint: "샌드박스 실행·행위 관찰" },
    ],
  },
  {
    category: "보안",
    title: "망분리(물리 vs 논리)",
    axis: "물리 분리 vs 가상 분리",
    items: [
      { name: "물리적 망분리", hint: "PC·회선 이중화·안전·고비용" },
      { name: "논리적 망분리", hint: "가상화·유연·저비용" },
    ],
  },
  {
    category: "보안",
    title: "터널링 보안(SSL/TLS vs IPSec)",
    axis: "어느 계층에서 보호하나",
    items: [
      { name: "SSL/TLS", hint: "전송~응용·웹·SSL VPN" },
      { name: "IPSec", hint: "네트워크 계층·IPSec VPN" },
    ],
  },
  {
    category: "보안",
    title: "콘텐츠 보호(워터마킹 vs 핑거프린팅)",
    axis: "소유권 vs 구매자 추적",
    items: [
      { name: "워터마킹", hint: "저작권 정보 삽입" },
      { name: "핑거프린팅", hint: "구매자별 정보·불법유통 추적" },
      { name: "스테가노그래피", hint: "존재 자체 은닉" },
    ],
  },
  {
    category: "보안",
    title: "위험 분석 기법",
    axis: "수치화하나 vs 서술하나",
    items: [
      { name: "정량적 분석", hint: "손실액·ALE 계산·객관" },
      { name: "정성적 분석", hint: "등급·시나리오·주관" },
    ],
  },
  {
    category: "보안",
    title: "개인정보 비식별(가명 vs 익명)",
    axis: "재식별 가능성",
    items: [
      { name: "가명처리", hint: "추가정보로 재식별 가능" },
      { name: "익명처리", hint: "재식별 불가·복원 불가" },
    ],
  },

  // ─────────────────────────── 인공지능 ───────────────────────────
  {
    category: "인공지능",
    title: "머신러닝 학습 유형",
    axis: "정답(라벨)이 있나·보상으로 배우나",
    items: [
      { name: "지도학습", hint: "라벨 있음·분류/회귀" },
      { name: "비지도학습", hint: "라벨 없음·군집·차원축소" },
      { name: "강화학습", hint: "보상·시행착오" },
      { name: "자기지도학습", hint: "데이터 자체로 라벨 생성" },
    ],
  },
  {
    category: "인공지능",
    title: "딥러닝 신경망",
    axis: "공간(이미지) vs 순서(시퀀스) vs 어텐션",
    items: [
      { name: "CNN", hint: "이미지·합성곱·특징추출" },
      { name: "RNN", hint: "시계열·순차·장기의존 약점" },
      { name: "트랜스포머(Transformer)", hint: "셀프 어텐션·병렬" },
    ],
  },
  {
    category: "인공지능",
    title: "순환신경망 개선(RNN·LSTM·GRU)",
    axis: "장기 의존성을 어떻게 다루나",
    items: [
      { name: "RNN", hint: "기본·기울기 소실" },
      { name: "LSTM", hint: "게이트 3개·셀 상태" },
      { name: "GRU", hint: "게이트 2개·경량·빠름" },
    ],
  },
  {
    category: "인공지능",
    title: "머신러닝 vs 딥러닝",
    axis: "특징을 사람이 vs 스스로",
    items: [
      { name: "머신러닝", hint: "특징 수작업·데이터 적음" },
      { name: "딥러닝", hint: "특징 자동학습·데이터·연산 많이" },
    ],
  },
  {
    category: "인공지능",
    title: "앙상블 기법",
    axis: "병렬로 분산 낮추기 vs 순차로 편향 줄이기",
    items: [
      { name: "배깅(Bagging)", hint: "병렬·분산↓·랜덤포레스트" },
      { name: "부스팅(Boosting)", hint: "순차·편향↓·XGBoost" },
      { name: "스태킹(Stacking)", hint: "메타모델로 결합" },
    ],
  },
  {
    category: "인공지능",
    title: "지도학습 문제 유형",
    axis: "무엇을 예측하나",
    items: [
      { name: "분류(Classification)", hint: "이산 범주 예측" },
      { name: "회귀(Regression)", hint: "연속 값 예측" },
    ],
  },
  {
    category: "인공지능",
    title: "분류 알고리즘",
    axis: "무엇을 기준으로 나누나",
    items: [
      { name: "SVM", hint: "최대 마진 초평면" },
      { name: "KNN", hint: "가까운 K개 다수결" },
      { name: "의사결정나무", hint: "규칙 분기·해석 쉬움" },
      { name: "나이브 베이즈", hint: "확률·독립 가정" },
    ],
  },
  {
    category: "인공지능",
    title: "군집(Clustering) 기법",
    axis: "군집 수·모양 가정",
    items: [
      { name: "K-평균(K-means)", hint: "K 지정·구형 군집" },
      { name: "DBSCAN", hint: "밀도 기반·K 불필요·잡음" },
      { name: "계층적 군집", hint: "덴드로그램·병합/분할" },
    ],
  },
  {
    category: "인공지능",
    title: "차원 축소",
    axis: "선형 vs 비선형·용도",
    items: [
      { name: "PCA(주성분분석)", hint: "선형·분산 최대 축" },
      { name: "t-SNE", hint: "비선형·시각화" },
      { name: "오토인코더", hint: "신경망·잠재표현" },
    ],
  },
  {
    category: "인공지능",
    title: "생성 모델(GAN·VAE·Diffusion)",
    axis: "어떻게 데이터를 생성하나",
    items: [
      { name: "GAN", hint: "생성자·판별자 경쟁" },
      { name: "VAE", hint: "잠재분포·인코더·디코더" },
      { name: "확산 모델(Diffusion)", hint: "노이즈 제거 복원·고품질" },
    ],
  },
  {
    category: "인공지능",
    title: "분류 성능 지표",
    axis: "무엇을 강조하는 지표인가",
    items: [
      { name: "정밀도(Precision)", hint: "예측 양성 중 실제 양성" },
      { name: "재현율(Recall)", hint: "실제 양성 중 맞춘 비율" },
      { name: "F1-Score", hint: "정밀도·재현율 조화평균" },
    ],
  },
  {
    category: "인공지능",
    title: "활성화 함수",
    axis: "어디에·왜 쓰나",
    items: [
      { name: "Sigmoid", hint: "0~1·이진·기울기 소실" },
      { name: "ReLU", hint: "은닉층·연산 간단·소실 완화" },
      { name: "Softmax", hint: "출력층·다중분류 확률" },
    ],
  },
  {
    category: "인공지능",
    title: "과적합(Overfitting) 대응",
    axis: "어떻게 일반화를 높이나",
    items: [
      { name: "드롭아웃", hint: "뉴런 임의 제거" },
      { name: "정규화(L1/L2)", hint: "가중치 penalty" },
      { name: "조기 종료", hint: "검증 손실 상승 시 중단" },
    ],
  },
  {
    category: "인공지능",
    title: "LLM 적용(RAG vs 파인튜닝)",
    axis: "외부 지식 검색 vs 모델 재학습",
    items: [
      { name: "RAG", hint: "검색+생성·최신 지식·저비용" },
      { name: "파인튜닝(Fine-tuning)", hint: "가중치 갱신·도메인 특화" },
      { name: "프롬프트 엔지니어링", hint: "학습 없이 지시로 유도" },
    ],
  },
  {
    category: "인공지능",
    title: "경량 파인튜닝(PEFT)",
    axis: "무엇만 학습하나",
    items: [
      { name: "Full Fine-tuning", hint: "전체 파라미터·비용↑" },
      { name: "LoRA", hint: "저랭크 행렬만·경량" },
      { name: "프롬프트 튜닝", hint: "소프트 프롬프트만 학습" },
    ],
  },
  {
    category: "인공지능",
    title: "판별형 vs 생성형 AI",
    axis: "경계를 나누나 vs 새로 만드나",
    items: [
      { name: "판별형 AI", hint: "분류·경계 학습" },
      { name: "생성형 AI", hint: "분포 학습·새 데이터 생성" },
    ],
  },

  // ─────────────────────────── 디지털서비스 ───────────────────────────
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
    title: "클라우드 배포 모델",
    axis: "누가 소유·운영하나",
    items: [
      { name: "퍼블릭 클라우드", hint: "공용·확장·저비용" },
      { name: "프라이빗 클라우드", hint: "전용·보안·통제" },
      { name: "하이브리드 클라우드", hint: "공용+전용 혼합" },
    ],
  },
  {
    category: "디지털서비스",
    title: "가상화 방식(VM vs 컨테이너)",
    axis: "OS 통째 vs 프로세스 격리",
    items: [
      { name: "가상머신(VM)", hint: "하이퍼바이저·게스트 OS·무거움" },
      { name: "컨테이너(Docker)", hint: "OS 커널 공유·가벼움·빠름" },
    ],
  },
  {
    category: "디지털서비스",
    title: "하이퍼바이저 유형",
    axis: "하드웨어 직접 vs OS 위",
    items: [
      { name: "Type1(베어메탈)", hint: "HW 직접·성능·서버" },
      { name: "Type2(호스티드)", hint: "호스트 OS 위·데스크톱" },
    ],
  },
  {
    category: "디지털서비스",
    title: "실감기술(AR·VR·MR·XR)",
    axis: "현실과 가상을 얼마나 섞나",
    items: [
      { name: "VR(가상현실)", hint: "완전 가상·몰입" },
      { name: "AR(증강현실)", hint: "현실+가상 정보 오버레이" },
      { name: "MR(혼합현실)", hint: "현실·가상 상호작용" },
      { name: "XR(확장현실)", hint: "AR·VR·MR 총칭" },
    ],
  },
  {
    category: "디지털서비스",
    title: "웹 서비스 API(REST·SOAP·GraphQL)",
    axis: "구조·유연성",
    items: [
      { name: "REST", hint: "자원·HTTP·가벼움" },
      { name: "SOAP", hint: "XML·엄격·WS-Security" },
      { name: "GraphQL", hint: "필요한 필드만·단일 엔드포인트" },
    ],
  },
  {
    category: "디지털서비스",
    title: "블록체인 유형",
    axis: "누가 참여·검증하나",
    items: [
      { name: "퍼블릭 블록체인", hint: "누구나·완전 분산" },
      { name: "프라이빗 블록체인", hint: "허가된 자만·빠름" },
      { name: "컨소시엄 블록체인", hint: "협의체·반중앙" },
    ],
  },
  {
    category: "디지털서비스",
    title: "합의 알고리즘",
    axis: "무엇으로 신뢰를 만드나",
    items: [
      { name: "PoW(작업증명)", hint: "해시 연산·전력 소모" },
      { name: "PoS(지분증명)", hint: "보유 지분·에너지 절약" },
      { name: "PBFT", hint: "투표·허가형·빠른 확정" },
    ],
  },
  {
    category: "디지털서비스",
    title: "스토리지 연결(DAS·NAS·SAN)",
    axis: "어떻게·무엇 단위로 연결하나",
    items: [
      { name: "DAS", hint: "직접 연결·단순" },
      { name: "NAS", hint: "파일 단위·이더넷" },
      { name: "SAN", hint: "블록 단위·전용망(FC)" },
    ],
  },
  {
    category: "디지털서비스",
    title: "웹 발전(Web 1.0~3.0)",
    axis: "사용자 역할·지능화",
    items: [
      { name: "Web 1.0", hint: "읽기·정적" },
      { name: "Web 2.0", hint: "읽기·쓰기·참여·SNS" },
      { name: "Web 3.0", hint: "시맨틱·지능·탈중앙" },
    ],
  },

  // ─────────────────────────── 프로젝트관리 ───────────────────────────
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
    title: "일정 기법(CPM·PERT·CCM)",
    axis: "시간 추정·제약 관점",
    items: [
      { name: "CPM(주공정법)", hint: "확정 시간·임계경로" },
      { name: "PERT", hint: "3점 추정·확률 일정" },
      { name: "CCM(주공정연쇄)", hint: "자원 제약·버퍼 관리" },
    ],
  },
  {
    category: "프로젝트관리",
    title: "여유시간(Free vs Total Float)",
    axis: "누구에게 영향 없는 여유인가",
    items: [
      { name: "자유 여유(Free Float)", hint: "후행 활동 영향 없음" },
      { name: "총 여유(Total Float)", hint: "프로젝트 종료 영향 없음" },
    ],
  },
  {
    category: "프로젝트관리",
    title: "품질보증 vs 품질통제(QA·QC)",
    axis: "프로세스 vs 결과물",
    items: [
      { name: "품질보증(QA)", hint: "프로세스 준수·예방·감사" },
      { name: "품질통제(QC)", hint: "산출물 검사·결함 발견" },
    ],
  },
  {
    category: "프로젝트관리",
    title: "위험 대응 전략(부정적)",
    axis: "위협을 어떻게 다루나",
    items: [
      { name: "회피(Avoid)", hint: "원인 제거·계획 변경" },
      { name: "전가(Transfer)", hint: "보험·외주로 이전" },
      { name: "완화(Mitigate)", hint: "확률·영향 축소" },
      { name: "수용(Accept)", hint: "받아들이고 대비" },
    ],
  },
  {
    category: "프로젝트관리",
    title: "원가 산정 방식",
    axis: "정밀도·시점",
    items: [
      { name: "유사 산정(하향식)", hint: "과거 유사·빠름·부정확" },
      { name: "모수 산정", hint: "단가×수량·통계" },
      { name: "상향식 산정", hint: "WBS 합산·정밀·시간↑" },
    ],
  },
  {
    category: "프로젝트관리",
    title: "범위 이탈(Scope Creep vs Gold Plating)",
    axis: "누가 요구하지 않았는데 커지나",
    items: [
      { name: "스코프 크리프", hint: "통제 없는 요구 추가" },
      { name: "골드 플레이팅", hint: "개발자 임의 과잉 기능" },
    ],
  },

  // ─────────────────────────── 경영전략 ───────────────────────────
  {
    category: "경영전략",
    title: "기간 시스템(CRM·ERP·SCM)",
    axis: "무엇을 관리하는 시스템인가",
    items: [
      { name: "ERP", hint: "전사 자원·내부 통합" },
      { name: "CRM", hint: "고객 관계·영업·마케팅" },
      { name: "SCM", hint: "공급망·물류·협력사" },
    ],
  },
  {
    category: "경영전략",
    title: "IT 관리 vs 거버넌스",
    axis: "운영 관리 vs 통제·의사결정",
    items: [
      { name: "ITSM/ITIL", hint: "IT 서비스 운영·관리" },
      { name: "COBIT", hint: "IT 거버넌스·통제 프레임워크" },
      { name: "ISO 38500", hint: "IT 거버넌스 국제표준" },
    ],
  },
  {
    category: "경영전략",
    title: "재해복구 목표(RTO·RPO)",
    axis: "얼마나 빨리 vs 얼마나 잃어도 되나",
    items: [
      { name: "RTO(복구 시간 목표)", hint: "언제까지 복구" },
      { name: "RPO(복구 시점 목표)", hint: "데이터 손실 허용 시점" },
    ],
  },
  {
    category: "경영전략",
    title: "시장 규모(TAM·SAM·SOM)",
    axis: "얼마나 넓은 시장인가",
    items: [
      { name: "TAM", hint: "전체 시장" },
      { name: "SAM", hint: "유효 시장(도달 가능)" },
      { name: "SOM", hint: "수익 시장(획득 가능)" },
    ],
  },
  {
    category: "경영전략",
    title: "전략 방향(선도자 vs 추격자)",
    axis: "먼저 진입 vs 빠른 추격",
    items: [
      { name: "선도자(First Mover)", hint: "선점·표준 주도·리스크" },
      { name: "추격자(Fast Follower)", hint: "리스크↓·개선 진입" },
    ],
  },
  {
    category: "경영전략",
    title: "성과 관리(BSC vs OKR)",
    axis: "균형 관점 vs 목표·핵심결과",
    items: [
      { name: "BSC", hint: "재무·고객·프로세스·학습 4관점" },
      { name: "OKR", hint: "도전 목표·핵심결과·주기 짧음" },
    ],
  },
];
