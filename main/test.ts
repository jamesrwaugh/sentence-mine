import { loadDataItems } from "common/data_items";
import { searchSentences } from "common/search_sentence";
import { analyze, analyzeSync, GetSudachiWords } from "common/sudachi";

function findNormalizedForm(searchTerm: string): string | null {
  const item = analyzeSync(searchTerm, { all: true, m: "c" });

  if (item.length === 1) {
    return item[0]?.normalized ?? null;
  }

  const goodPoses = ["形容詞", "動詞", "名詞", "形状詞"];

  const usefulCount = item.filter(
    (x) => x.pos?.pos && goodPoses.includes(x.pos.pos)
  );

  if (usefulCount.length === 1) {
    return usefulCount[0]?.normalized ?? null;
  }

  console.log("Unable to normalize", searchTerm);

  return null;
}

async function getNormalizedFormMaybe(term: string) {
  const rawTokens = await analyze(term);
  const a = rawTokens.find((t) => t.surface == term);
  return a?.normalized ?? a?.dictionary ?? term;
}

export async function getClozeSentence(
  term: string,
  sentence: string
): Promise<{
  sentence: string;
  found: boolean;
}> {
  {
    // Try fancy way, tokenize the sentence and look for
    // the normalized form in both.
    const badPos = ["BOS/EOS", "BOS", "EOS"];
    const termNormalized = await getNormalizedFormMaybe(term);
    const rawTokens = await analyze(sentence);

    const cleanTokens = rawTokens.filter((t) =>
      t.surface ? !badPos.includes(t.surface) : true
    );

    let found = false;

    const clozedSentence = cleanTokens.reduce((acc, term) => {
      if (term.normalized === termNormalized) {
        found = true;
        return `${acc}{{c1::${term.surface}}}`;
      }
      return `${acc}${term.surface}`;
    }, "");

    if (found) {
      return {
        sentence: clozedSentence,
        found,
      };
    }
  }

  // Easy way out, if the raw term is just in the sentence
  if (sentence.includes(term)) {
    return {
      found: true,
      sentence: sentence.replace(term, `{{c1::${term}}}`),
    };
  }

  return {
    found: false,
    sentence: sentence,
  };
}

async function main() {
  const term = "工夫";
  const items = await loadDataItems();
  const s = searchSentences(term, items);
  console.log(s);
}

await main();
