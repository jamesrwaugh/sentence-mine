# sentencemine

- Install MeCab
- Download and extract jitendex-yomitan
- Download Ankidrone Sentence Pack from https://tatsumoto.neocities.org/blog/ankidrone-sentence-pack
- Get Heisig Keywords list CSV from https://joliss.github.io/heisig-jpdb/kanji-keywords-6th-edition.html
- Install AnkiConnect to Anki
- Unpack Ankidrone pack: `bun run rebuild_unpack.ts`
- `bun run index.ts`

If the Ankidrone Pack ever changes, run `rebuildDictformIndex` to recreate `dictform_index.json`

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```
