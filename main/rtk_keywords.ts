import { DataPaths } from "./IDataItems";
import { loadCsv } from "./io";

export interface RtkKeywordLine {
  kanji: string;
  heisigId: string;
  heisigKeyword: string;
  heisigCollisions: string;
  jpdbKeyword: string;
  jpdbCollisions: string;
}

export async function GetJouyouRtkKeywords(): Promise<RtkKeywordLine[]> {
  const rtkKeywords = await loadCsv<RtkKeywordLine>(DataPaths.rtkKeywordsCsv);
  return rtkKeywords.filter((r) => Number(r.heisigId) <= 2200);
}

export function FindRtkKeywords(
  word: string | undefined,
  rtkKeywordsAll: RtkKeywordLine[]
) {
  const wordLetters = word?.split("");

  const wordLettersSet = [...new Set(wordLetters)];

  const rtkKeywordsFound = wordLettersSet
    .map((letter) => rtkKeywordsAll.find((r) => r.kanji === letter))
    .filter((r) => r !== undefined)
    .map((r) => r);

  return rtkKeywordsFound;
}

export function FindRtkKeywordsJoinedComma(
  word: string | undefined,
  rtkKeywordsAll: RtkKeywordLine[]
) {
  return FindRtkKeywords(word, rtkKeywordsAll)
    .map((r) => `${r.kanji}: ${r.heisigKeyword}`)
    .join(", ");
}
