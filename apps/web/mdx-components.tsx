import type { MDXComponents } from "mdx/types";

import { Cite } from "@/components/citation";
import {
  Boundary,
  Lead,
  LessonSection,
  TryIt,
} from "@/components/lesson-components";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: () => null,
    p: (props) => <p className="lesson-paragraph" {...props} />,
    a: (props) => <a className="text-link" {...props} />,
    Lead,
    LessonSection,
    TryIt,
    Boundary,
    Cite,
    ...components,
  };
}
