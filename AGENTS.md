# solar-open2

Service built on Upstage **Solar Open 2** via the Upstage Chat API (console: https://console.upstage.ai/api/chat). API key lives in `.env` (never commit it).

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues. Use the `gh` CLI.

### Triage labels

Use `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`.

### Domain docs

This is a single-context repo. `CONTEXT.md` is the domain glossary only; read relevant records in `docs/adr/` before changing a decision.

Create an ADR only when the choice is hard to reverse, surprising without context, and the result of a real trade-off.

### Evidence research

When authoring curriculum or retrieval policy, read `docs/research/verified-ai-literacy-sources.md`. When changing citation UI, read `docs/research/citation-provenance-ux.md`. Do not load either for unrelated work.
