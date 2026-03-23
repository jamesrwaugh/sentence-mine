import { max } from "underscore";
import type { DictNote } from "./search_sentence";
import { GetSudachiWords } from "./sudachi";

export async function chooseNextBestNote(
  originalSentence: string,
  options: DictNote[],
  knownWordSet: Set<string>
): Promise<DictNote | null> {
  if (options.length == 0) {
    return null;
  }

  const originalWords = new Set(await GetSudachiWords(originalSentence));

  async function Go(s: DictNote) {
    const items = await GetSudachiWords(s.sentence.sentence);
    return {
      words: new Set(items),
      original: s,
    };
  }

  const sudachiPromises = options.map((s) => Go(s));

  const dictNoteWordsSets = await Promise.all(sudachiPromises);

  const scored = dictNoteWordsSets
    .filter((s) => s.words.size > 0)
    .map(({ words, original }) => {
      const intersection = words.intersection(knownWordSet);
      const intersectionPct = intersection.size / words.size;
      const diffPenalty =
        Math.abs(words.size - originalWords.size) / originalWords.size;
      return {
        original: original,
        score: intersectionPct - diffPenalty,
      };
    });

  const bestScore = max(scored, (a) => a.score);

  if (typeof bestScore == "number") {
    return null;
  }

  return bestScore.original;
}
