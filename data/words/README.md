# Word Pipeline

The runtime game loads `data/words/word-bank.json` through `lib/words.ts`. This folder also holds the seed list, source notes, and cached raw downloads.

## Build

```bash
npm run build:words            # uses cached raw downloads when available
npm run build:words -- --refresh   # force fresh downloads
```

The builder writes exactly 20,000 single-word entries split into `green` (6,000), `yellow` (6,000), `red` (6,000), and `money` (2,000), plus a short Open English WordNet gloss for every entry under `definitions`.

Inputs used:

- `data/words/seed-decks.json` — hand-reviewed seed entries.
- ESDB / SCOWL `en_US` and `en_US-large` 2026.02.25 (`en-wl/wordlist-diff`) — single-word candidate pool. Generated words must appear in the default `en_US` list unless they are in the small hand-reviewed `EASY_WORDS` set.
- CMUdict — pronounceability and syllable signal.
- Open English WordNet 2025 — semantic attestation and gloss definitions.
- wordfreq 3.1.1 — Zipf-frequency gate (≥3.0 for color decks, ≥3.15 for money).
- CEFR-J / Open Language Profiles — CEFR-level hint for difficulty scoring.

Raw downloads cache under `data/words/raw/` and are gitignored.

The builder removes exact and spacing-insensitive duplicates, malformed entries, unsafe or party-awkward words, niche definition patterns (e.g. Roman numerals, proper-name capitalization, apostrophes), and most short abbreviation-like entries.

## Audit

```bash
npm run audit:words
```

Verifies the four-deck split, single-word-only enforcement, exact and cross-deck duplicate removal, full definition coverage, Zipf floors, and the difficulty shape (length, syllables, abstract morphology, source-list membership).

## Sources and licensing

`open-word-sources.json` lists every candidate source with its license, recommended use, and risk note. ShareAlike or NonCommercial sources (Word Prevalence 62K, ConceptNet, Wiktionary, Princeton WordNet C1/C2 splits) are documented but **not** ingested into the committed runtime bank.

## Review-only organizer

```bash
npm run organize:words -- <inputs...> --output data/words/organized.generated.json
```

Pools every candidate without tags, dedupes, filters, and emits `green` / `yellow` / `red` / `money` plus score/reason records. With no input file, it reorganizes the current bundled bank. Supported inputs:

- TXT — one candidate per line
- CSV — `word`/`headword`/`lemma`/`text`/`term`/`phrase` column; optional `cefr`/`level`, `zipf`/`frequency`, `deck`
- JSON — arrays of strings, arrays of objects, `{ words: [...] }`, `{ records: [...] }`, or `{ decks: { ... } }`
- JSONL — raw words or one JSON object per line

Output files match `*.generated.json` and are gitignored.
