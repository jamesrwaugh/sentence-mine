import { z } from "zod";

export const SentenceSchema = z.object({
  japanese: z.string().describe("The Japanese text of the sentence"),
  english: z.string().describe("The English translation of the sentence"),
  reading: z.string().describe("The reading of the sentence in kana"),
  english_context: z
    .string()
    .describe("A short English context for the sentence"),
});

export const ResponseSchema = z.object({
  sentences: z.array(SentenceSchema).describe("The generated sentences"),
  term_reading: z.string().describe("The reading of the term in kana"),
  term_english_context: z
    .string()
    .describe(
      "A short English descrirption of why this term best fits this sentence over the other terms. Compare and contrast the closest other term."
    ),
});

export type SentenceSearchResult = z.infer<typeof ResponseSchema>;

export type SentenceSearchFn = (
  term: string,
  other_terms: string[],
  max_sentences: number
) => Promise<SentenceSearchResult | null>;
