# solar-open2

Service built on Upstage **Solar Open 2** via the Upstage Chat API (console: https://console.upstage.ai/api/chat). API key lives in `.env` (never commit it).

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary — label strings equal the five canonical role names. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
