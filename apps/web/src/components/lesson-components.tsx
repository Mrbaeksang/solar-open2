import type { ReactNode } from "react";

import { AskSectionButton } from "./reading-context-provider";

export function Lead({ children }: { children: ReactNode }) {
  return <div className="chapter-lead">{children}</div>;
}

export function LessonSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="lesson-section"
      data-learning-section={id}
      aria-labelledby={`${id}-title`}
    >
      <div className="lesson-section-heading">
        <h2 id={`${id}-title`}>{title}</h2>
        <AskSectionButton sectionId={id} />
      </div>
      {children}
    </section>
  );
}

export function TryIt({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <aside className="try-it" aria-label={`생각 활동: ${title}`}>
      <span className="callout-kicker">생각 실험</span>
      <h3>{title}</h3>
      <div>{children}</div>
    </aside>
  );
}

export function Boundary({ children }: { children: ReactNode }) {
  return (
    <aside className="boundary" aria-label="비유와 설명의 한계">
      <span aria-hidden="true">↳</span>
      <div>
        <strong>여기까지가 설명의 경계</strong>
        {children}
      </div>
    </aside>
  );
}
