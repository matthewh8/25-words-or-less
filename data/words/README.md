# Word Research Pipeline

This folder is for source research and generated review files. The runtime game still uses `lib/words.ts` until generated output is deliberately applied.

## Source Strategy

Use open sources as candidate pools, not direct playable dumps:

- SCOWL / English Speller Database for broad single-word candidates.
- CEFR-J / Open Language Profiles for level hints.
- Open English WordNet or Princeton WordNet for part-of-speech and semantic checks.
- CMUdict for pronounceability and syllable checks.
- wordfreq for frequency hints when its attribution/licensing constraints are acceptable.

Current source notes live in `open-word-sources.json`.

## Path To 20,000 Words

The practical expansion path is SCOWL / English Speller Database first. It can export American English lists by size; size 50/60 is the useful range for party-game candidates, while larger sizes add too many obscure words. Feed that export into the no-tag organizer with any CEFR/frequency columns available:

```bash
npm run organize:words -- data/words/raw/scowl-us-60.txt data/words/raw/cefr.csv --output data/words/organized.generated.json
```

Target mix for a 20,000-word bank:

- `green`: 5,000-6,000 short/common/concrete words
- `yellow`: 9,000-10,000 broad middle words
- `red`: 4,000-5,000 long/abstract/technical words
- `money`: 500-1,000 reviewed phrases

Do not integrate the full generated file blindly. Review summary counts, sample each deck, then apply the generated `decks` arrays to `lib/words.ts`.

## No-Tag Organization

The active organizer ignores tags. It pools every candidate together, dedupes, filters, and emits only four buckets:

- `green`
- `yellow`
- `red`
- `money`

Run:

```bash
npm run organize:words -- path/to/candidates.csv path/to/more.txt --output data/words/organized.generated.json
```

If no input file is passed, it reorganizes the current bundled bank from `lib/words.ts`.

Supported input shapes:

- TXT: one candidate per line
- CSV: `word`, `headword`, `lemma`, `text`, `term`, or `phrase`; optional `cefr`/`level`, `zipf`/`frequency`, and `deck`
- JSON: arrays of strings, arrays of objects, `{ "words": [...] }`, `{ "records": [...] }`, or `{ "decks": { ... } }`
- JSONL: raw words or one JSON object per line

The generated file includes `decks` plus score/reason records. It intentionally does not include tags. Generated JSON files are ignored by git so stale review artifacts do not linger in the repo.
