"use client";

import { useId, useState } from "react";

import type { Quiz as QuizType } from "@/lib/content";

export function Quiz({ quiz }: { quiz: QuizType }) {
  const groupName = useId();
  const [selection, setSelection] = useState<number>();
  const [checked, setChecked] = useState(false);
  const correct = selection === quiz.correctIndex;

  return (
    <section className="quiz-section" aria-labelledby={`${groupName}-title`}>
      <span className="callout-kicker">읽은 뒤 1분</span>
      <h2 id={`${groupName}-title`}>확인 문제</h2>
      <fieldset aria-label="확인 문제">
        <legend>{quiz.question}</legend>
        <div className="quiz-options">
          {quiz.options.map((option, index) => (
            <label
              className={`quiz-option ${
                checked && index === quiz.correctIndex
                  ? "quiz-option-correct"
                  : ""
              }`}
              key={option}
            >
              <input
                type="radio"
                name={groupName}
                value={index}
                checked={selection === index}
                disabled={checked}
                onChange={() => setSelection(index)}
              />
              <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
              {option}
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        className="button button-primary"
        disabled={selection === undefined || checked}
        onClick={() => setChecked(true)}
      >
        정답 확인
      </button>
      {checked ? (
        <div className={`quiz-feedback ${correct ? "is-correct" : ""}`} role="status">
          <strong>{correct ? "맞았어요." : "한 번 더 생각해 봐요."}</strong>
          <p>{quiz.explanation}</p>
        </div>
      ) : null}
    </section>
  );
}
