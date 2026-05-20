# Word Research Pipeline

This folder is for source research, source seeds, and generated runtime word-bank data. The runtime game loads `data/words/word-bank.json` through `lib/words.ts`.

## Source Strategy

Use open sources as candidate pools, not blind playable dumps:

- ESDB / SCOWL American English wordlists for broad single-word candidates.
- CMUdict for pronunciation and syllable checks.
- Open English WordNet for semantically attested fallback words when pronunciation-filtered ESDB does not meet the target.
- CEFR-J / Open Language Profiles for level hints.
- Open English WordNet or Princeton WordNet for part-of-speech and semantic checks.
- wordfreq for frequency hints when its attribution/licensing constraints are acceptable.

Current source notes live in `open-word-sources.json`.

## Runtime 50,000-Entry Bank

The committed runtime bank is generated with:

```bash
npm run build:words
```

The builder writes `data/words/word-bank.json` with exactly 50,000 playable entries:

- starts from the safe hand-reviewed seed entries in `data/words/seed-decks.json`
- downloads ESDB / SCOWL `en_US` and `en_US-large` 2026.02.25 from `en-wl/wordlist-diff`
- uses CMUdict as the primary pronounceability filter
- uses Open English WordNet 2025 for semantically attested fill words and for a curated final-round phrase allowlist
- removes exact duplicates, spacing-insensitive near duplicates, malformed entries, unsafe or party-awkward words, roman-numeral artifacts, proper-name capitalization, apostrophes, punctuation, and most too-short abbreviation-like entries
- audits every accepted single word into a 25/50/25 easy/medium/hard split based on clueability under 5-word boards, tight clue-word budgets, stack point risk, pronunciation evidence, source commonness, length, syllables, abstract morphology, inflection noise, and part of speech
- keeps the money deck small and phrase-only because it draws 10 words per game and unreviewed dictionary phrases get noisy quickly

Raw downloads are cached under `data/words/raw/` and ignored by git. Use `npm run build:words -- --refresh` to force fresh downloads.

Current generated mix:

- `green`: 16,000 easiest single words
- `yellow`: 16,000 broad standard words used for default bidding
- `red`: 16,000 longer, abstract, inflected, obscure, or harder-to-clue words
- `money`: 2,000 reviewed phrases, including the original curated party-game seed plus curated Open English WordNet phrases

Run the repeatable final audit with:

```bash
npm run audit:words
```

## No-Tag Organization

The review organizer ignores tags. It pools every candidate together, dedupes, filters, and emits only four buckets:

- `green`
- `yellow`
- `red`
- `money`

Run:

```bash
npm run organize:words -- path/to/candidates.csv path/to/more.txt --output data/words/organized.generated.json
```

If no input file is passed, it reorganizes the current bundled bank from `data/words/word-bank.json`.

Supported input shapes:

- TXT: one candidate per line
- CSV: `word`, `headword`, `lemma`, `text`, `term`, or `phrase`; optional `cefr`/`level`, `zipf`/`frequency`, and `deck`
- JSON: arrays of strings, arrays of objects, `{ "words": [...] }`, `{ "records": [...] }`, or `{ "decks": { ... } }`
- JSONL: raw words or one JSON object per line

The generated file includes `decks` plus score/reason records. It intentionally does not include tags. Generated JSON files are ignored by git so stale review artifacts do not linger in the repo.
