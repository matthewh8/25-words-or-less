# 25 Words or Less

Local same-screen party implementation built with Next.js App Router.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Game Modes

Game modes are YAML files in `gamemodes/`. The home screen lists every file in that directory and `/game?mode=<id>` loads the selected mode on the server before the client reducer starts.

Bundled modes: `classic`, `quick-party`, `chaos`, `no-mercy`, `team-draft`, `finals-week`, `chill`, `drinking-lite`, `sudden-death`, `word-nerd`.

A mode controls bidding rules, stack rounds and options, the money round, timers and presets, clue-action toggles, party challenges, and accessibility defaults. See `lib/gameMode.ts` for the full schema; `gamemodes/classic.yaml` is the reference template.

To add a mode, copy `classic.yaml`, change `id`/`name`/rule values, and restart the dev server. Invalid YAML throws in development and falls back to `classic` in production. Any challenge prompt containing `21+ option` must include a non-alcohol alternative.

## Word Bank

Playable words live in `data/words/word-bank.json` across four decks:

- `green`: 6,000
- `yellow`: 6,000
- `red`: 6,000
- `money`: 2,000

The bank is server-only; the client fetches round-sized deals from `/api/deal` so bundled chunks stay free of the word list.

Build, audit, and review scripts:

```bash
npm run build:words      # regenerate word-bank.json from open sources
npm run audit:words      # verify decks, duplicates, definitions, commonness, shape
npm run organize:words   # review-only candidate organizer (writes *.generated.json)
```

Pipeline details and source attribution live in `data/words/README.md`. `validateWordBank()` and `getWordBankSummary()` in `lib/words.ts` enforce structure and expose deck sizes for tests.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run audit
npm run audit:words
npm run build
npm run check      # runs lint + typecheck + test + build
```
