# 25 Words or Less

Local same-screen party implementation built with Next.js App Router.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Game Modes

Game modes live in `gamemodes/*.yaml`. The home screen lists every YAML file in that directory, and `/game?mode=<id>` loads the selected mode on the server before starting the client reducer.

Bundled modes:

- `classic.yaml`
- `quick-party.yaml`
- `chaos.yaml`
- `no-mercy.yaml`
- `team-draft.yaml`
- `finals-week.yaml`
- `chill.yaml`
- `drinking-lite.yaml`
- `sudden-death.yaml`
- `word-nerd.yaml`

Each YAML file controls:

- bidding contests, bid bounds, word count, and success/failure scoring
- stack rounds, stack labels, per-word points, word limits, and all-correct bonus
- money round word count, word limit, jackpot points, and timers
- timer presets and min/max custom timer bounds
- keyboard clue-action behavior
- party challenge frequency, caps, and optional 21+ prompts
- accessibility defaults such as speech-recognition opt-in

To add a mode, copy `gamemodes/classic.yaml`, change `id`, `name`, and the rule values, then restart the dev server if it was already running.

In development, invalid YAML mode definitions throw with schema errors. In production, bad or missing modes fall back to classic. Any configured `21+ option` challenge prompt must include a non-alcohol alternative, and any challenge-capable mode must define at least one prompt.

## Word Bank

Words are organized by green/yellow/red difficulty decks plus a money-round deck in `lib/words.ts`. Current curated deck sizes:

- green: 2,054
- yellow: 1,925
- red: 2,092
- money: 160

Source and pipeline notes live in `data/word-bank-sources.md`. `npm run import:words -- <cefr_csv> data/word-bank.generated.json --source-id <slug-id> --source-name "<name>" --source-url <https-or-local-url> --license-note "<license note>"` generates a cleaned, attributed expansion file from a compatible CEFR CSV for review before integrating a larger bank.

`validateWordBank()` checks deck IDs, difficulty tiers, source attribution, tag validity, ISO import dates, within-deck and cross-play-deck duplicates, empty values, malformed entries, over-long entries, lowercase entries, and blocked unsafe terms.
`getWordBankSummary()` exposes the same inventory in code so deck sizes and source coverage are covered by tests, not only README prose.

The full word bank is imported by server code. The client requests round-sized deals from `/api/deal`, so generated client chunks stay free of the bundled word-bank literals and only receive the words needed for the next screen.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run audit
npm run build
npm run check
```
