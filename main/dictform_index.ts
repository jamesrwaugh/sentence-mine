import { ModelFields } from "./search_sentence";
import { loadSentenceDeck } from "./search_sentence";
import { tokenizeSync } from "@enjoyjs/node-mecab";

export type DictformIndex = Record<string, number[]>;

export async function rebuildDictformIndex() {
  const deck = await loadSentenceDeck();

  const result: DictformIndex = {};

  deck.noteFields
    // .sort(() => Math.random() - 0.5)
    // .slice(0, 250)
    .forEach((n, sentenceIndex) => {
      const searchTerm = n[ModelFields.SentKanji];
      if (!searchTerm) {
        return;
      }
      const tokens = tokenizeSync(searchTerm);
      // console.log("-----" + searchTerm + "-----");
      const badPos = ["助詞", "記号", "BOS/EOS"];
      for (const token of tokens) {
        if (token.feature.pos && !badPos.includes(token.feature.pos)) {
          // console.log(
          //   token.surface +
          //     " " +
          //     token.feature.pos +
          //     " " +
          //     token.feature.basicForm
          // );
          const basicForm = token.feature.basicForm || token.surface;
          result[basicForm] = [...(result[basicForm] || []), sentenceIndex];
        }
      }
    });

  console.log(JSON.stringify(result));
}

export async function loadDictformIndex(
  filename: string
): Promise<DictformIndex> {
  const text = await Bun.file(filename).text();
  return JSON.parse(text) as DictformIndex;
}
