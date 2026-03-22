import { analyze } from "common/sudachi";

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
