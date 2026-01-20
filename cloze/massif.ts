import type { SentenceSearchFn } from "./sentence_schema";

export interface MassifApiResponse {
  hits: number;
  hits_limited: boolean;
  results: MassifApiResult[];
}

export interface MassifApiResult {
  highlighted_html: string;
  sample_source: MassifApiSampleSource;
  source_count: number;
  text: string;
}

export interface MassifApiSampleSource {
  publish_date: Date;
  title: string;
  url: string;
}

async function searchMassifApi(query: string): Promise<MassifApiResponse> {
  const response = await fetch(
    `https://massif.la/ja/search?q=${encodeURIComponent(query)}&fmt=json`,
    {
      method: "GET",
    }
  );

  return response.json() as Promise<MassifApiResponse>;
}

export const searchMassif: SentenceSearchFn = async (
  term: string,
  other_terms: string[],
  max_sentences: number
) => {
  try {
    const response = await searchMassifApi(term);

    const sentences = response.results
      .slice(0, max_sentences)
      .map((result) => ({
        japanese: result.text,
        english: "",
        reading: "",
        english_context: "",
      }));

    return {
      sentences,
      term_reading: term,
      term_english_context: "",
    };
  } catch (error) {
    console.error("Error searching Massif API:", error);
    return null;
  }
};
