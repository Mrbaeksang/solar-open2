import Link from "next/link";

const trackCards = [
  {
    track: "easy",
    label: "쉬운 트랙",
    age: "초5–중3",
    title: "먼저 예시로 만나고, 원리를 차근차근",
    description:
      "생활 속 상황 → 실제 원리 → 비유의 한계 순서로 읽어요. 아이 취급하지 않는 또렷한 문장을 씁니다.",
    assistant: "따뜻한 과학 길잡이",
  },
  {
    track: "standard",
    label: "기본 트랙",
    age: "고등학생 이상",
    title: "핵심 주장과 반례를 근거로 검토하기",
    description:
      "작동 원리 → 사례 → 한계와 반례 → 출처 순서로 읽어요. 비전공 성인에게도 필요한 깊이만 남겼습니다.",
    assistant: "차분한 연구 멘토",
  },
] as const;

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="home-hero">
        <div className="hero-noise" aria-hidden="true" />
        <div className="home-hero-copy">
          <p className="hero-kicker">
            공개 · 로그인 없음 · 주장별 원출처
          </p>
          <h1>
            AI를 쉽게 배우되,
            <br />
            <em>쉽게 믿지는 않도록.</em>
          </h1>
          <p className="hero-summary">
            두 수준으로 따로 쓴 AI 교과서입니다. 번호를 누르면 정확한
            근거가 열리고, 궁금한 문장을 고르면 지금 읽는 자리를 아는
            도우미에게 물을 수 있어요.
          </p>
          <div className="hero-actions">
            <Link href="/learn/easy/ai-is" className="button button-primary">
              쉬운 트랙 시작
              <span aria-hidden="true"> →</span>
            </Link>
            <Link href="/learn/standard/ai-is" className="button button-ghost">
              기본 트랙 시작
            </Link>
          </div>
        </div>
        <div className="hero-proof" aria-label="교과서의 세 가지 약속">
          <article>
            <span>01</span>
            <div>
              <strong>문장 뒤에서 바로</strong>
              <p>기관·판·날짜·정확한 위치까지 여는 출처 표식</p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <strong>지금 읽는 자리만</strong>
              <p>원시 DOM 대신 짧은 읽기 맥락을 보내는 트랙 도우미</p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <strong>모르면 멈추기</strong>
              <p>근거 있음·부족·범위 밖을 숫자 확신도 없이 표시</p>
            </div>
          </article>
        </div>
      </section>

      <section className="track-choice" aria-labelledby="track-choice-title">
        <div className="section-heading">
          <p className="section-kicker">같은 목표, 다른 집필</p>
          <h2 id="track-choice-title">내 읽기 방식 고르기</h2>
          <p>
            문장을 짧게 줄인 복제판이 아닙니다. 사례, 활동, 문제와 AI
            도우미의 설명 순서를 각 트랙에 맞춰 따로 썼습니다.
          </p>
        </div>
        <div className="track-card-grid">
          {trackCards.map((card, index) => (
            <article
              className={`track-card track-card-${card.track}`}
              key={card.track}
            >
              <div className="track-card-top">
                <span className="track-index">0{index + 1}</span>
                <span className="track-age">{card.age}</span>
              </div>
              <p className="track-label">{card.label}</p>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <div className="track-assistant">
                <span aria-hidden="true">✦</span>
                <div>
                  <small>전용 AI 도우미</small>
                  <strong>{card.assistant}</strong>
                </div>
              </div>
              <Link
                href={`/learn/${card.track}/ai-is`}
                className="track-link"
              >
                {card.label} 시작
                <span aria-hidden="true">↗</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="how-it-works" aria-labelledby="how-title">
        <div className="section-heading section-heading-light">
          <p className="section-kicker">읽는 동안 검증하기</p>
          <h2 id="how-title">교과서가 답을 만드는 법도 공개합니다</h2>
        </div>
        <div className="flow-row" aria-label="질문 답변 과정">
          <div>
            <span>읽기 맥락</span>
            <p>트랙 · 챕터 · 절 · 선택 문장</p>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>하이브리드 검색</span>
            <p>의미 검색 + 전문 검색</p>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>검증된 ID</span>
            <p>등록된 출처만 응답</p>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>정직한 상태</span>
            <p>근거 있음 · 부족 · 범위 밖</p>
          </div>
        </div>
        <p className="flow-note">
          브라우저는 Upstage API를 직접 호출하지 않습니다. 대화 원문은
          서버에 장기 저장하지 않습니다.
        </p>
      </section>

      <section className="curriculum-preview">
        <div className="section-heading">
          <p className="section-kicker">7개 챕터 · 두 원고</p>
          <h2>필요한 원리만, 책임까지</h2>
        </div>
        <ol>
          {[
            "AI란 무엇인가",
            "데이터로 배우고 예측하기",
            "모델이 답을 고르는 방법",
            "생성형 AI와 언어 모델",
            "AI가 틀리는 이유와 검증법",
            "RAG와 출처 기반 답변",
            "AI를 책임 있게 사용하기",
          ].map((title, index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{title}</strong>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
