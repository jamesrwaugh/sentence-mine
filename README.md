# sentencemine

## Install and Get Data

- Install MeCab
- Install Sudachi-rs
- Download and extract jitendex-yomitan
- Download Ankidrone Sentence Pack from https://tatsumoto.neocities.org/blog/ankidrone-sentence-pack
- Get Heisig Keywords list CSV from https://joliss.github.io/heisig-jpdb/kanji-keywords-6th-edition.html
- Install AnkiConnect to Anki
- Unpack Ankidrone pack: `bun run rebuild_unpack.ts`
- `bun run index.ts`

If the Ankidrone Pack ever changes, run `rebuildDictformIndex` to recreate `dictform_index.json`

## Install

`bun install`

## Tools

- main: Reads a CSV and imports sentence cards with native audio
- shuffle: Replaces sentence card content with a new sentence for the same word, picking one most overlapping the mature words in the deck, and similar length to the original
- cloze: Reads a CSV with multiple choice groups the generates sentence cloze cards, with sentence (Grok) and audio (Google Chirp3 voices) AI-generated
