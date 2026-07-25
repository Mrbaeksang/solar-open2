import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";

const trackCards = [
  {
    track: "easy",
    label: "쉬운 트랙",
    age: "초5–중3",
    title: "생활 속 예시부터 차근차근",
    description:
      "짧은 설명과 익숙한 예시로 시작해 실제 원리와 한계까지 알아봅니다.",
    assistant: "쉬운 말과 예시로 답합니다",
  },
  {
    track: "standard",
    label: "기본 트랙",
    age: "고등학생 이상",
    title: "원리와 사례를 조금 더 자세히",
    description:
      "핵심 원리, 실제 사례, 한계와 확인 방법을 비전공자도 이해할 수 있게 설명합니다.",
    assistant: "원리와 근거를 차례로 설명합니다",
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
            AI를 처음부터
            <br />
            <em>쉽게 이해하기</em>
          </h1>
          <p className="hero-summary">
            AI가 무엇인지, 어떻게 배우고 답을 만드는지, 왜 틀릴 수
            있는지를 두 가지 난이도로 설명합니다. 근거 칩을 누르면
            출처도 바로 확인할 수 있어요.
          </p>
          <div className="hero-actions">
            <Button
              label="쉬운 트랙 시작"
              href="/learn/easy/ai-is"
              variant="primary"
              size="lg"
              className="button button-primary"
              endContent={<span aria-hidden="true">→</span>}
            />
            <Button
              label="기본 트랙 시작"
              href="/learn/standard/ai-is"
              variant="secondary"
              size="lg"
              className="button button-ghost"
            />
          </div>
        </div>
        <div className="hero-proof" aria-label="교과서의 세 가지 약속">
          <article>
            <span>01</span>
            <div>
              <strong>문장 뒤에서 바로</strong>
              <p>근거 칩을 눌러 원문과 정확한 위치 확인</p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <strong>지금 읽는 자리만</strong>
              <p>현재 챕터와 선택한 문장을 바탕으로 질문</p>
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
            설명 순서를 각 트랙에 맞춰 따로 썼습니다.
          </p>
        </div>
        <div className="track-card-grid">
          {trackCards.map((card, index) => (
            <article key={card.track}>
              <Card
                padding={6}
                className={`track-card track-card-${card.track}`}
              >
                <div className="track-card-top">
                  <span className="track-index">0{index + 1}</span>
                  <Badge
                    variant={card.track === "easy" ? "green" : "blue"}
                    label={card.age}
                    className="track-age"
                  />
                </div>
                <p className="track-label">{card.label}</p>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <div className="track-assistant">
                  <span aria-hidden="true">AI</span>
                  <div>
                    <small>AI 설명 도우미</small>
                    <strong>{card.assistant}</strong>
                  </div>
                </div>
                <Button
                  label={`${card.label} 시작`}
                  href={`/learn/${card.track}/ai-is`}
                  variant="secondary"
                  size="lg"
                  width="100%"
                  className="track-link"
                  endContent={<span aria-hidden="true">→</span>}
                />
              </Card>
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
          질문은 서버를 거쳐 처리하며, 대화 원문은 장기 저장하지
          않습니다.
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
