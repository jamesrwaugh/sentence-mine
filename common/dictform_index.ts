import { chunk } from "underscore";
import { ModelFields } from "./search_sentence";
import { loadSentenceDeck } from "./search_sentence";
import { analyze } from "./sudachi";

export type DictformIndex = Record<string, number[]>;

async function buildIndex(items: string[][], startIndex: number) {
  let sentenceIndex = startIndex;

  const result: DictformIndex = {};

  for (const n of items) {
    const searchTerm = n[ModelFields.SentKanji];

    if (!searchTerm) {
      continue;
    }

    const tokens = await analyze(searchTerm, { all: true, m: "c" });

    const badPos = ["助詞", "記号"];

    for (const token of tokens) {
      if (token.pos?.pos && !badPos.includes(token.pos.pos)) {
        const normalForm =
          token.normalized ?? token.dictionary ?? token.surface;
        result[normalForm] = [...(result[normalForm] || []), sentenceIndex];
      }
    }

    sentenceIndex += 1;
  }

  return result;
}

export async function rebuildDictformIndex(outputFilename: string) {
  const deck = await loadSentenceDeck();

  const chunkSize = 5000;
  const chunks = chunk(deck.noteFields, chunkSize);

  const promises = chunks.map((chunk, i) => buildIndex(chunk, i * chunkSize));
  const promiseResults = await Promise.all(promises);

  const results = promiseResults.reduce((fullIndex, thisIndex) => {
    const items = Object.entries(thisIndex);
    items.forEach(
      (item) =>
        (fullIndex[item[0]] = [...(fullIndex[item[0]] || []), ...item[1]])
    );
    return fullIndex;
  }, {} as DictformIndex);

  Bun.write(outputFilename, JSON.stringify(results));
}

export async function loadDictformIndex(
  filename: string
): Promise<DictformIndex> {
  const text = await Bun.file(filename).text();
  return JSON.parse(text) as DictformIndex;
}
