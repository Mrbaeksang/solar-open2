# 검증된 AI 리터러시 자료 코퍼스

조사 기준일: 2026-07-24  
대상: 별도로 집필하는 `쉬운 트랙`(초5–중3)과 `기본 트랙`(고1 이상·성인)

## 결론

이 프로젝트가 그대로 번역해 쓸 만한 단일 “검증된 교과서”는 없다. 가장 안전하고 품질이 높은 방법은 다음과 같다.

1. **2026 OECD·EU 최종 AI Literacy Framework를 교육과정의 1차 뼈대로 사용한다.**
2. UNESCO 프레임워크로 인간 중심성·윤리·AI 기초·설계 역량이 빠지지 않았는지 교차 검토한다.
3. 쉬운 트랙의 연령별 난이도는 AI4K12와 MIT RAISE 자료로 검토하되, 두 자료의 `비상업·동일조건변경허락` 제약 때문에 본문을 그대로 번역하거나 구조를 복제하지 않는다.
4. 생성형 AI의 위험과 어린이용 어시스턴트 원칙은 NIST와 UNICEF로 검증한다.
5. Solar Open 2에 관한 사실만 Upstage의 기술 보고서·모델 카드로 검증하고, Upstage가 발표한 자사 성능 수치는 `제조사 발표`로 표시한다.
6. 두 트랙은 같은 근거 지도를 공유할 수 있지만 설명, 비유, 예시, 퀴즈, 어시스턴트 말투를 각각 독립적으로 집필한다. 실시간 “쉬운 말 번역”으로 한 트랙을 다른 트랙으로 만들지 않는다.

즉, 권장 코퍼스는 “한 권의 원전”이 아니라 아래 역할별 묶음이다.

| 역할 | 1차 자료 | 결정 |
|---|---|---|
| 교육과정 주축 | OECD·EU AILit Framework (2026) | 채택 |
| 국제적 역량 교차표 | UNESCO AI Competency Framework for Students (2024) | 채택, 본문 파생은 주의 |
| K–12 연령 교차표 | AI4K12 Five Big Ideas와 progression charts | 보조 사용; 초안 상태를 표시 |
| 수업 활동 아이디어 | MIT RAISE / Day of AI | 아이디어·링크 중심; 직접 개작은 분리 |
| 11–14세 설명·활동 검토 | Raspberry Pi Foundation / Google DeepMind Experience AI | 참고·인용만; 개작 금지 |
| 성인용 설명 난이도 참고 | Elements of AI | 인용·참고만 |
| 위험·한계 사실 검증 | NIST AI RMF 1.0 + GenAI Profile | 채택 |
| 아동 권리·어시스턴트 안전 | UNICEF Guidance on AI and Children 3.0 | 채택 |
| Solar Open 2 제품 사실 | Upstage technical report + model card | 제한적으로 채택 |

## “무료 열람”과 “번역·개작 허용”은 다르다

무료로 읽을 수 있다는 사실만으로 번역, 복제, 재배포, RAG 원문 적재가 허용되지는 않는다.

| 자료 | 무료 열람 | 번역·개작 | 상업적 이용 | 핵심 제약 |
|---|---:|---:|---:|---|
| OECD·EU AILit 2026 | 예 | 예 | 예 | CC BY 4.0, 번역·개작 고지와 출처 표시, 제3자 자료 제외 |
| UNESCO 학생 프레임워크 | 예 | 예 | 예 | CC BY-SA 3.0 IGO, 동일·유사 라이선스 공유, 파생물 고지 |
| AI4K12 | 예 | 예 | 아니오 | CC BY-NC-SA 4.0 |
| Day of AI | 예 | 예 | 아니오 | CC BY-NC-SA 4.0, MIT·Day of AI 상표 사용 금지 |
| Experience AI | 예 | **아니오** | 아니오 | CC BY-NC-ND 4.0, 번역·개작 금지 |
| Elements of AI | 예 | **공식 허용을 확인하지 못함** | 확인 불가 | 공개 강좌라는 사실만 확인됨; 인용 전용으로 취급 |
| NIST AI RMF | 예 | 예 | 예 | 미국 내 공공영역; 해외까지 재인쇄·파생물 권리 부여, 제3자 저작물 주의 |
| UNICEF Guidance 3.0 | 예 | 예 | 예 | CC BY 4.0, 로고·사진·별도 저작권 표시 자료 제외 |
| Solar Open 2 기술 보고서 | 예 | 예 | 예 | 보고서는 CC BY 4.0; 모델 가중치 라이선스는 별도 |

이 문서는 라이선스의 실무적 해석이며 법률 자문은 아니다. 원문을 실제로 재사용할 때는 고정한 버전의 라이선스 전문을 다시 확인해야 한다.

## 후보별 검토

### 1. OECD·European Union, *Empowering Learners for the Age of AI*

**권위와 소유자.** OECD와 European Commission이 공동 발행한 초·중등교육용 최종 AI 리터러시 프레임워크다. OECD PISA Governing Board가 2026-04-08 승인했고, 2026-06-18 최종본이 공개됐다. 2025년 협의용 초안이 아니라 DOI가 부여된 최종 64쪽 간행물을 사용해야 한다. [OECD 간행물 페이지](https://www.oecd.org/en/publications/empowering-learners-for-the-age-of-ai_65cd27d4-en.html), [최종 PDF와 이용 조건](https://www.oecd.org/content/dam/oecd/en/publications/reports/2026/06/empowering-learners-for-the-age-of-ai_2f8315e7/65cd27d4-en.pdf)

**범위와 적합 연령.** AI와 관계 맺기, AI로 만들기, AI 관리하기, AI 설계하기의 네 차원과 19개 역량을 지식·기술·태도로 풀고, 기본·중간·고급 수준의 수업 사례를 제공한다. 초등과 중등을 명시적으로 대상으로 하므로 쉬운 트랙 전체와 기본 트랙의 고등학생 구간에 가장 잘 맞는다. 성인 과정은 직접 대상이 아니므로 성인 예시와 맥락은 따로 집필해야 한다. [European Commission 발표](https://education.ec.europa.eu/whats-new/news/new-ai-literacy-framework-helps-schools-prepare-learners-for-the-age-of-artificial-intelligence)

**라이선스.** CC BY 4.0이다. 번역과 개작, 상업적 이용이 가능하지만 원작 인용, 변경 표시, 번역·개작에 대해 PDF가 요구하는 고지를 넣어야 한다. 제3자 자료에는 라이선스가 적용되지 않으며 OECD·European Commission 로고, 시각 정체성, 표지는 별도 허가 없이 쓸 수 없다.

**한국어.** 조사 시점에 공식 한국어판은 확인되지 않았다. 현재 공식 출판물은 영어판 식별자 `65cd27d4-en`이다. 따라서 한국어화할 경우 정식 번역본처럼 보이지 않게 “이 프로젝트의 번역·개작”임을 명시해야 한다.

**권장 역할.** `교육과정 주축`. 두 트랙의 공통 역량 지도와 챕터별 학습 성과를 여기서 만들되, 학생용 원고는 트랙별로 새로 쓴다.

### 2. UNESCO, *AI Competency Framework for Students*

**권위와 소유자.** UNESCO가 2024-08-08 발행한 학생 AI 역량 프레임워크다. 인간 중심 사고, AI 윤리, AI 기술과 응용, AI 시스템 설계의 네 차원 아래 12개 역량과 이해·적용·창작의 세 수준을 제시한다. 공식 페이지는 2026-01-16 갱신됐지만 영어 원문의 발행 연도와 ISBN은 2024다. [UNESCO 간행물 페이지](https://www.unesco.org/en/articles/ai-competency-framework-students), [영어 원문](https://unesdoc.unesco.org/ark:/48223/pf0000391105)

**범위와 적합 연령.** 학생과 교육과정 설계자를 위한 전 지구적 규범 프레임워크다. 특정 학년별 읽기 수준보다 역량과 교수법을 다루므로 두 트랙의 “빠진 역량 검사”에 적합하지만, 그대로 챕터 순서나 학생용 문장으로 쓰기에는 추상적이다.

**라이선스.** CC BY-SA 3.0 IGO다. 텍스트의 번역·개작과 상업적 사용은 가능하지만 파생물은 같거나 유사한 라이선스로 공유해야 한다. UNESCO는 파생물에 비공식 자료라는 고지를 요구하며 로고 사용을 허용하지 않는다. 별표가 붙은 이미지와 제3자 시각 자료는 라이선스 밖이다. [UNESCO CC BY-SA 이용 조건](https://www.unesco.org/en/open-access/cc-sa)

**한국어.** 공식 페이지가 제공하는 언어는 아랍어, 영어, 프랑스어, 포르투갈어, 스페인어, 베트남어이며 한국어는 없다.

**권장 역할.** `보조 교육과정 주축 및 사실 교차 검증`. ShareAlike 의무가 본문 전체로 번지는 것을 피하려면 표와 문장을 복제하기보다 OECD·EU 기반 목차를 UNESCO 역량과 내부적으로 매핑한다. UNESCO 표를 직접 번역해 공개할 경우 해당 산출물과 라이선스 고지를 분리한다.

### 3. AI4K12, *Five Big Ideas in AI*와 Grade Band Progression Charts

**권위와 소유자.** AI4K12는 AAAI와 Computer Science Teachers Association이 공동 후원하고 미국 National Science Foundation 지원을 받은 K–12 AI 교육 이니셔티브다. 다섯 핵심 개념은 인식, 표현과 추론, 학습, 자연스러운 상호작용, 사회적 영향이다. [AI4K12 소개](https://ai4k12.org/), [학년군 progression charts](https://ai4k12.org/gradeband-progression-charts/)

**범위와 적합 연령.** K–2, 3–5, 6–8, 9–12 네 학년군을 구분한다. 쉬운 트랙의 초5·중등 경계와 기본 트랙의 고등학생 구간을 검토하기 좋다. 다만 성인용 자료는 아니다.

**현재 상태.** 다섯 progression chart 모두 조사 시점에도 `draft`이며 공개 피드백을 받고 있다. 하나의 최신 최종판으로 승인된 교육 표준이 아니다. 예를 들어 Big Idea 2 working draft는 2021, Big Idea 5 v0.1은 2022에 공개됐다. 포스터는 현재 v2가 게시돼 있다. 따라서 “미국의 확정 국가표준”으로 소개하면 안 된다.

**라이선스.** AI4K12가 만든 포스터·인포그래픽 등은 CC BY-NC-SA 4.0이다. 출처 표시, 비상업, 동일조건변경허락을 모두 지켜야 한다. 다른 조건이 필요하면 별도 협의를 요구한다. [AI4K12 라이선스](https://ai4k12.org/licensing-terms/)

**한국어.** 다섯 핵심 개념 **포스터의 공식 한국어 파일**은 제공하지만, 학년군 progression chart 전체의 공식 한국어판은 확인되지 않았다. [다국어 포스터](https://ai4k12.org/resources/big-ideas-poster/)

**권장 역할.** `연령 교차표 및 활동 아이디어`. 초안이므로 교육과정의 유일한 주축이나 최종 사실 권위로 쓰지 않는다. 상업적 선택지를 유지하려면 독특한 문장·배열·활동을 번역하지 말고 독립 집필 후 내부 체크리스트로만 대조한다.

### 4. MIT RAISE / Day of AI

**권위와 소유자.** MIT RAISE 연구자와 교육자들이 개발한 K–12 AI 리터러시 자료다. 현재 사이트는 5–7, 8–10, 11–13, 14–18세 자료를 제공하며, `What is AI?`, 중등·고등용 기초, 데이터·편향·알고리즘·신경망·생성형 AI 활동을 포함한다. [MIT RAISE의 Day of AI 소개](https://raise.mit.edu/resources/curricula/day-of-ai/), [현재 curriculum library](https://dayofai.org/curriculum-resources), [11–13세 기초 단원](https://dayofai.org/units/ai-foundations-for-middle-grades), [14–18세 기초 단원](https://dayofai.org/units/ai-foundations-for-high-school)

**범위와 적합 연령.** 손으로 해보는 활동과 교실 토론 설계가 강점이다. 쉬운 트랙의 활동, 퀴즈, 오개념 발견 장치를 설계할 때 특히 유용하고 기본 트랙의 고등학생 구간에도 맞는다. 성인 독서형 교재의 구조로 그대로 옮기기에는 교실 활동 비중이 높다.

**현재 상태.** 고정된 한 판의 교과서가 아니라 계속 갱신되는 자료 라이브러리다. 사이트에는 2025–26 planning guide와 2026년 자료가 노출돼 있다. 재현 가능한 검토를 위해 실제 사용한 단원 URL, 다운로드 파일명, 접근일, 파일 해시를 저장해야 한다.

**라이선스.** 현재 이용 조건은 CC BY-NC-SA 4.0이다. 번역·개작은 가능하지만 비상업 용도여야 하고 파생물도 같은 라이선스로 공개해야 한다. MIT, RAISE, Day of AI 명칭·로고는 출처 표시를 넘어 홍보나 보증 암시에 쓸 수 없다. 사이트는 비상업 여부를 사용자 유형이 아니라 실제 이용 방식으로 판단한다고 설명한다. [Day of AI 이용 조건](https://dayofai.org/about-us/about-us-2)

**한국어.** 조사한 현재 기초 단원의 언어 선택지에는 중국어 번체, 일본어, 스페인어 등이 보이지만 한국어는 확인되지 않았다.

**권장 역할.** `활동 아이디어`. 본문과 활동을 독립적으로 새로 쓰는 것을 기본으로 한다. 특정 활동을 직접 번역·개작한다면 별도 `CC BY-NC-SA 4.0` 자료로 분리하고 원출처, 변경 사항, 라이선스를 표시한다. 향후 광고·유료 과정·기업 교육 가능성이 있다면 직접 개작은 제외한다.

### 5. Raspberry Pi Foundation / Google DeepMind, *Experience AI*

**권위와 소유자.** 영국 교육 자선단체 Raspberry Pi Foundation이 Google DeepMind와 공동 개발한 AI·ML 교육 프로그램이다. AI 교육 자료를 분석하기 위해 500개가 넘는 기존 자료를 검토하고, 교사 가이드·슬라이드·활동·평가가 포함된 6개 기초 수업을 설계했다. 2023년 4월 첫 자료를 공개했고 현재도 갱신하는 프로그램이다. [공식 Experience AI 사이트](https://experience-ai.org/en/), [Raspberry Pi Foundation의 개발 설명](https://www.raspberrypi.org/blog/ai-education-resources-what-to-teach-seame-framework/), [2023년 공개 안내](https://www.raspberrypi.org/blog/experience-ai-launch-lessons/)

**범위와 적합 연령.** 명시적 대상은 11–14세다. 기초 6개 수업 외에 LLM의 작동 방식, 이점, 출력이 항상 믿을 만하지 않은 이유를 다루는 독립 수업도 제공한다. 따라서 쉬운 트랙의 중학생 구간에 매우 잘 맞고, 이 연령에서 가능한 개념 밀도와 오개념 방지 방식을 검토하기 좋다. [2025 프로그램 현황](https://www.raspberrypi.org/blog/experience-ai-the-story-so-far/)

**현재 상태.** 고정판 교과서가 아니라 living resource다. 2026년 공식 보고는 19개 언어, 추가 부분 번역, 180개국 이상의 다운로드를 밝힌다. 실제 참조 시 단원 파일과 접근일·해시를 고정해야 한다. [2026 impact report](https://static.raspberrypi.org/files/about/Experience_AI_Impact_report_2026.pdf)

**라이선스.** 현재 배포되는 educator guide와 수업 자료에는 `CC BY-NC-ND 4.0`이 표시돼 있다. 무료 공유는 가능하지만 비상업이어야 하고, **번역·개작·변형한 자료를 배포할 수 없다**. 여러 국가의 공식 현지화판이 존재한다는 사실은 제3자에게 번역 권한이 열려 있다는 뜻이 아니다. 예시나 활동지를 한국어로 옮겨 싣지 않는다. [라이선스가 표시된 공식 배포 자료의 예](https://experience-ai.org/es/drive_resources/136.pdf)

**한국어.** 현재 공식 사이트가 표시하는 19개 언어와 부분 이중언어 목록에 한국어는 없다.

**권장 역할.** `11–14세 난이도 검토와 인용 전용`. 학습 성과의 범위와 오개념 방지 원리를 참고해 독립적인 한국어 설명·활동을 새로 만들되, 고유한 수업 순서·문장·워크시트·슬라이드·그림은 복제하거나 번역하지 않는다.

### 6. University of Helsinki / MinnaLearn, *Elements of AI*

**권위와 소유자.** University of Helsinki와 MinnaLearn이 2018년에 시작한 비전공자용 공개 온라인 강좌다. 복잡한 수학이나 프로그래밍 없이 AI의 가능성과 한계를 설명하는 것을 목표로 하며, University of Helsinki는 26개 언어와 누적 100만 명 수강을 발표했다. [Elements of AI 공식 사이트](https://www.elementsofai.com/), [University of Helsinki 소개](https://www.helsinki.fi/en/news/artificial-intelligence/elements-ai-has-introduced-one-million-people-basics-artificial-intelligence)

**범위와 적합 연령.** 성인과 고등학생 이상 비전공자의 설명 밀도, 예시 순서, 개념 범위를 비교하는 참고 자료로 좋다. 초5–중3용으로 설계된 자료는 아니며 아동 안전·개인정보 설계의 근거가 되지 않는다.

**현재 상태.** 2018년 출시 이후 운영되는 living course이며, 공개 사이트에서 교재 전체의 명확한 판 번호나 마지막 내용 개정일을 확인하지 못했다. 인용 시 `accessed 2026-07-24`를 남겨야 한다.

**라이선스.** 무료이고 누구나 수강 가능하다는 공식 설명은 확인되지만, 공식 강좌 본문 전체에 적용되는 Creative Commons 또는 번역·파생물 허용 문구는 확인하지 못했다. 별도 커뮤니티 이용 약관의 사용자 게시물 조항은 강좌 본문의 재사용 허가가 아니다. 명시적 서면 허가 전에는 일반 저작권이 적용된다고 보고 다뤄야 한다.

**한국어.** 공식 사이트가 노출하는 현재 언어 목록과 University 발표의 번역 현황에서 한국어판을 확인하지 못했다.

**권장 역할.** `인용 전용`. 성인용 설명의 난이도와 누락 여부를 사람이 참고하되 문장, 문제, 그림, 강좌 구조를 번역·복제하지 않는다. 원문 전체를 production RAG에 적재하지 않는다.

### 7. NIST, *AI Risk Management Framework 1.0*과 *Generative AI Profile*

**권위와 소유자.** 미국 National Institute of Standards and Technology가 발행한 자발적 AI 위험관리 표준 자료다. AI RMF 1.0은 2023년 1월, 생성형 AI용 companion profile인 NIST AI 600-1은 2024년 7월 최종 발행됐다. NIST는 조사 시점에 AI RMF 1.0 개정을 진행 중이라고 표시한다. [AI RMF 공식 허브](https://www.nist.gov/itl/ai-risk-management-framework), [AI RMF 1.0](https://doi.org/10.6028/NIST.AI.100-1), [GenAI Profile](https://doi.org/10.6028/NIST.AI.600-1)

**범위와 적합 연령.** AI를 설계·도입·평가하는 조직과 실무자를 위한 자료여서 학생용 교재나 연령별 교수 자료는 아니다. 대신 생성형 AI의 위험 유형, 신뢰성, 검증, 인간 감독, 잘못된 정보, 개인정보, 편향에 관한 사실 검토에 강하다.

**라이선스.** NIST 직원 저작물은 미국 내 저작권 보호 대상이 아니며, NIST는 해외 권리에 대해서도 재인쇄와 파생물에 관한 전 세계적 권리를 부여한다. 출처 표시가 필요하고, 외부 기고자나 별도 표기된 제3자 자료에는 다른 저작권이 있을 수 있다. [NIST 저작권·사용 정책](https://www.nist.gov/open/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series-publications)

**한국어.** 공식 한국어판은 확인되지 않았다.

**권장 역할.** `위험·한계 사실 검증`. 챕터의 “AI가 틀릴 수 있는 이유”, “답을 검증하는 법”, “어떤 일을 AI에 맡기면 안 되는가”를 검수한다. 조직용 위험관리 문구를 학생에게 그대로 노출하지 않고 연령별 원고를 새로 쓴다.

### 8. Upstage, *Solar Open 2 Technical Report*와 model card

**권위와 소유자.** Solar Open 2 개발사 Upstage의 1차 기술 공개다. 2026-07-22 공개된 기술 보고서 v1과 공식 Hugging Face model card는 250B total / 15B active MoE, 한국어·영어·일본어, 1M context 등 모델의 설계와 평가 조건을 설명한다. [한국어 발표](https://www.upstage.ai/blog/ko/solar-open-2), [공식 model card](https://huggingface.co/upstage/Solar-Open2-250B), [기술 보고서 v1](https://arxiv.org/abs/2607.20062)

**범위와 적합 연령.** 연구자·엔지니어용 모델 기술 자료다. 어느 트랙에도 학생용 교재로 직접 적합하지 않다. 이 프로젝트가 실제로 사용하는 모델의 정체, 지원 언어, 구조, 컨텍스트, 알려진 사용법을 설명할 때만 적합하다.

**라이선스.**

- 기술 보고서는 arXiv에서 CC BY 4.0으로 공개돼 번역·개작이 가능하다.
- 모델 가중치는 별도 `Upstage Solar License`다. 파생 AI 모델에는 `Solar` 접두어, `Built with Solar` 표시, 라이선스 사본 등 별도 조건이 있다. 이는 보고서 본문의 CC BY 4.0과 혼동하면 안 된다. [Upstage Solar License](https://huggingface.co/upstage/Solar-Open2-250B/blob/main/LICENSE)
- API를 호출해 챗봇을 운영하는 조건은 모델 가중치 재배포 조건과 같다고 가정하지 말고, 실제 Upstage API 약관을 배포 시점에 별도로 확인한다.

**한국어.** 공식 한국어 발표가 있고 모델은 한국어를 공식 지원한다. 기술 보고서와 model card의 본문은 주로 영어다.

**권장 역할.** `제품별 사실 검증`. 모델 일반 원리나 AI 교육과정의 중립적 권위로 사용하지 않는다. 벤치마크와 효율 수치는 “Upstage가 보고한 결과”라고 표시하고, 자사 보고서만으로 교육 효과·안전성·정확성을 입증하지 않는다.

### 9. UNICEF, *Guidance on AI and Children 3.0*

**권위와 소유자.** UNICEF Innocenti가 아동권리협약을 토대로 만든 아동 중심 AI 정책·제품 지침이다. 생성형 AI, AI 동반자, 아동 데이터와 사생활, 차별, 설명 가능성, 복지, 포용 등을 반영한 현재 판은 version 3.0, 2025년 12월이다. 전문가 자문, 외부 검토, 아동·보호자 조사를 거쳤다. [공식 소개와 개발 과정](https://www.unicef.org/innocenti/reports/policy-guidance-ai-children), [version 3.0 PDF](https://www.unicef.org/innocenti/media/11991/file/UNICEF%20Innocenti%20Guidance%20on%20AI%20and%20Children%203%202025.pdf)

**범위와 적합 연령.** 학생용 교과서는 아니지만, 미성년자가 쓰는 챗봇의 말투와 경계, 사생활 보호, 감정적 의인화 금지, 인간 도움으로의 전환을 설계하는 핵심 근거다. 쉬운 트랙에 직접 적용되며 기본 트랙의 미성년 사용자에게도 적용된다.

**라이선스.** 본문은 CC BY 4.0이다. UNICEF 로고와 사진, 다른 저작권 표시가 붙은 자료는 제외되고, 로고·사진은 간행물의 정확한 사본 외에는 사용할 수 없다.

**한국어.** version 3.0 공식 페이지는 영어만 제공한다. 이전 2.0의 공식 언어 목록에도 한국어는 없다.

**권장 역할.** `아동 안전 사실 검증 및 제품 거버넌스`. 쉬운 트랙 어시스턴트를 “친구나 사람처럼 감정을 가진 존재”로 연출하지 않고, 개인정보를 요청하지 않으며, 위험·정서·건강 문제에서는 신뢰할 수 있는 어른에게 연결하도록 하는 제품 요구사항의 근거로 쓴다.

## 권장 코퍼스 구조

### 공통 역량 지도

OECD·EU의 4개 차원과 19개 역량을 내부 canonical map으로 삼는다. 각 역량에 다음 교차 참조를 단다.

- UNESCO의 4개 차원·12개 역량
- AI4K12의 해당 Big Idea와 학년군
- NIST의 관련 위험 범주
- 미성년자 관련 항목이면 UNICEF 요구사항

공개 원고가 OECD·EU 구조의 실질적 개작이라면 CC BY 4.0 고지와 요구되는 번역·개작 문구를 넣는다. UNESCO·AI4K12·Day of AI의 표나 배열을 직접 합쳐 새 표로 만들지 않는다.

### 쉬운 트랙: 초5–중3

- 학습 성과: OECD·EU 기본·중간 수준을 중심으로 선택
- 연령 검토: AI4K12 3–5, 6–8, 9–12 경계와 대조
- 활동 설계: Day of AI와 Experience AI에서 활동 유형·난이도만 참고해 한국 생활 맥락으로 새로 작성
- 안전과 어시스턴트 성격: UNICEF 3.0을 필수 제품 근거로 사용
- 기술 설명: 수식보다 관찰, 분류, 예측, 데이터 편향, 확률적 출력, 확인 행동을 중심으로 독립 집필

### 기본 트랙: 고1 이상·성인

- 학습 성과: OECD·EU 중간·고급 수준과 UNESCO 이해·적용 수준을 조합
- 설명 밀도: Elements of AI는 비교 참고만 하고 원문을 재사용하지 않음
- 위험과 검증: NIST GenAI Profile을 근거로 환각, 출처 확인, 개인정보, 인간 감독을 다룸
- 제품 사례: Solar Open 2는 “이 사이트가 사용하는 한 모델의 사례”로만 다루고 AI 전체의 대표로 일반화하지 않음

## 출처 거버넌스 정책

### 1. Source registry

모든 출처를 사람이 검토하는 registry에 등록한다.

```text
source_id
owner
title
edition_or_version
publication_date
stable_url_or_doi
exact_locator          # page, section, table
language
authority_type         # intergovernmental, government, university, vendor
independence           # independent, vendor-self-report
license
allowed_use            # adapt, quote-only, facts-only, excluded
third_party_exceptions
last_verified_at
review_due_at
content_hash
```

“웹에서 찾았다”는 이유만으로 production source가 되지 않는다. 소유 기관의 공식 페이지, DOI, 공식 저장소, 공식 모델 카드 중 하나에서 판과 이용 조건을 확인해야 한다.

### 2. Claim-level provenance

- 챕터 단위 참고문헌만 두지 말고 사실 주장마다 `claim_id → source_id + exact_locator`를 저장한다.
- 한 문단에 서로 다른 주장이 있으면 인용을 나눈다.
- 시맨틱 검색 결과가 가깝다는 이유만으로 출처를 붙이지 않는다. 답변에 표시되는 출처는 실제로 그 주장을 뒷받침하는 승인된 claim record여야 한다.
- 제조사 자료로 제조사 자체 성능을 말할 때는 `제조사 발표` 배지를 붙인다.
- 논쟁적이거나 빠르게 변하는 주장에는 가능한 한 서로 독립적인 1차 자료 두 개를 요구한다.

### 3. 번역·개작과 RAG 경계

- production RAG의 기본 코퍼스는 **검수 완료한 프로젝트 자체 한국어 원고**와 claim registry다.
- Elements of AI처럼 재사용 허가가 불명확한 자료는 원문 전체를 벡터 DB에 넣지 않는다.
- NC-SA 자료를 직접 번역·개작한 경우 별도 디렉터리와 별도 라이선스 고지로 격리하고, 상업 기능과 결합하기 전에 재검토한다.
- CC 라이선스라도 제3자 사진, 도표, 로고, 표지까지 자동으로 허용된다고 가정하지 않는다.
- 번역은 새로운 사실 검증이 아니다. 한국어 원고 작성자는 원문 locator를 확인하고, 기술 검토자가 번역 때문에 의미가 달라지지 않았는지 승인한다.

### 4. 트랙별 편집 검수

각 챕터는 최소 다음 승인을 거친다.

1. AI·ML 기술 검토
2. 해당 연령대 한국어 교육 검토
3. 출처·라이선스 검토
4. 쉬운 트랙은 추가로 아동 안전·개인정보 검토

두 트랙이 같은 claim record를 사용할 수는 있지만 본문을 서로 자동 변환하지 않는다. 비유, 사례, 질문, 정답 해설, 어시스턴트의 격려 방식도 각각 검수한다.

### 5. 갱신 주기

| 출처 유형 | 정기 검토 | 즉시 재검토 조건 |
|---|---:|---|
| OECD·UNESCO·UNICEF 최종 프레임워크 | 12개월 | 새 판·정오표·공식 번역 |
| NIST | 6개월 | AI RMF 새 버전 또는 profile 개정 |
| AI4K12·Day of AI·Experience AI·Elements of AI living pages | 6개월 | 단원·라이선스·언어 목록 변경 |
| Upstage model card·API·약관 | 3개월 | 모델/API/가격/약관 변경 |
| 링크와 파일 해시 | 매 릴리스 | 링크 오류 또는 파일 내용 변경 |

날짜나 제품 사양처럼 변하는 사실은 원고에 박아 두기보다 registry에서 만료 상태를 추적한다.

### 6. 출처 UI와 답변 정책

독서 본문과 챗봇 답변의 출처 카드는 최소 다음을 보여준다.

- 소유 기관과 문서 제목
- 버전 또는 발행일
- 해당 주장과 연결된 페이지·섹션
- `독립 기관` 또는 `제조사 발표`
- 라이선스와 마지막 검증일
- 원문 열기

호버는 빠른 확인 수단이고 유일한 접근 수단이 되어서는 안 된다. 모바일에서는 탭 가능한 citation sheet가 필요하다. 챗봇이 근거를 찾지 못했을 때는 그럴듯한 출처를 생성하지 말고 `이 교재의 검증된 자료에서 확인하지 못했습니다`라고 답해야 한다.

## 릴리스 게이트

챕터를 공개하기 전에 다음을 모두 통과시킨다.

- 기술적·역사적·통계적 주장에 claim-level source가 있다.
- 링크된 locator가 실제 주장을 지지한다.
- 라이선스가 허용한 이용 범위와 실제 이용이 일치한다.
- 필수 attribution, 변경 표시, 번역·개작 고지가 자동 생성된 `Sources / Licenses` 페이지에 나타난다.
- 쉬운 트랙에서 어시스턴트가 사람, 친구, 상담사처럼 자신을 오인시키지 않는다.
- 서로 다른 트랙의 예시와 평가 문항이 단순한 문장 축약본이 아니다.
- 제조사 발표와 독립적 검증을 시각적으로 구분한다.
- 만료되었거나 변경된 source record가 없고 파일 해시가 일치한다.

이 정책을 따르면 “검증된 교과서”라는 표현은 한 기관의 권위를 빌리는 마케팅 문구가 아니라, 어떤 주장도 원출처·버전·이용 조건·검토자를 거슬러 올라갈 수 있다는 운영 방식이 된다.
