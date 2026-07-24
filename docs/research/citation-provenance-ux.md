# Citation and provenance UX

## Findings

- assistant-ui supports structured `source` message parts with a URL and title, and renders them as source links. Its documented streaming path emits structured source chunks rather than asking the model to place arbitrary URLs in answer text. [assistant-ui Sources](https://www.assistant-ui.com/docs/ui/sources)
- assistant-ui can also render named custom data parts, so a trusted backend can stream a stable source ID and the frontend can resolve richer metadata from the project's source registry. [assistant-ui API reference](https://www.assistant-ui.com/docs/api-reference/overview)
- Hover-only source details are not sufficient. WCAG 2.2 requires hover/focus content to be dismissible, hoverable, and persistent, while the ARIA tooltip pattern does not allow focusable controls inside a tooltip. Interactive source details therefore need an activated popover, disclosure, sheet, or dialog rather than only a tooltip. [WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html), [WAI-ARIA Tooltip Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
- WCAG 2.2 sets a 24×24 CSS-pixel minimum target size subject to limited exceptions; 44×44 is the enhanced target. Small inline citation markers should therefore have an equivalent larger control in the answer's source list, especially on mobile. [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [WCAG 2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)

## Recommended interaction

1. Place a compact numbered source marker immediately after each supported claim.
2. On desktop, hover or keyboard focus may show a short non-interactive preview.
3. Click, Enter, or tap opens an interactive source card; mobile uses a bottom sheet.
4. Every answer ends with a larger **Sources** disclosure containing the same references.
5. Every chapter has a bibliography, and the site has a searchable source index.
6. Source cards show the owner, title, publication or revision date, exact section or page, URL or DOI, license, and the date the project reviewed it.
7. The Go backend sends only stable source IDs selected by retrieval. It resolves URLs and metadata from the source registry so the model cannot invent a citation.
8. Do not display an invented numeric confidence score. Use evidence states such as **교재 근거 있음**, **근거 부족**, and **교재 범위 밖**.
