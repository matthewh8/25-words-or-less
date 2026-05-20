# Word Bank Sources

Imported: 2026-05-19

## Current Bundled Bank

- Source: Open Language Profiles English datasets from CEFR-J
- URL: https://github.com/openlanguageprofiles/olp-en-cefrj
- License note: the repository states the CEFR-J vocabulary and grammar profile datasets can be used for research and commercial purposes with citation; copyright belongs to Tono Laboratory at Tokyo University of Foreign Studies.
- Transform: uppercase, dedupe, A1/A2 to green, B1 to yellow, B2 to red, remove unsafe and low-playability entries, then add a small original party-game money-round list.

## Expansion Pipeline

Run `npm run import:words -- <cefr_csv> data/word-bank.generated.json --source-id <slug-id> --source-name "<name>" --source-url <https-or-local-url> --license-note "<license note>"` against a compatible CSV with a word/headword/lemma column and a CEFR level column. Source ids must be lowercase letters, numbers, and hyphens; source URLs must start with `http://`, `https://`, or `local:`.

The script:

- maps A1/A2 to green, B1 to yellow, and B2 to red
- uppercases, normalizes spacing, and dedupes entries across generated decks
- removes spacing-insensitive near duplicates such as `AIR GUITAR` vs `AIRGUITAR`, even when the duplicates land in different generated tiers
- removes unsafe blocked terms
- rejects empty, non-word, and over-long entries
- emits generated JSON with source id, source name, source URL, license note, import date, source path, transform, and cleaned decks for review before app integration

The app currently ships the curated TypeScript bank in `lib/words.ts`; `validateWordBank()` enforces:

- valid deck IDs and difficulty tiers
- source attribution on every deck
- source metadata with ISO import dates
- at least one known tag per deck
- within-deck and cross-play-deck duplicate checks
- spacing normalization and spacing-insensitive near-duplicate checks
- empty, lowercase, malformed-character, over-long, and blocked-term checks
