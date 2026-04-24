import { z } from "zod";

const DifferenceChoicesObject = z.object({
  w: z.string().describe("The word."),
  r: z
    .string()
    .describe(
      'A single, short phrase why the word does not fit the sentence. For example, "Too strict."'
    ),
});

export const DifferenceContextSchema = z.object({
  summary: z
    .string()
    .describe("Brief explanation of why the term best fits this sentence."),
  others: z
    .array(DifferenceChoicesObject)
    .describe("The other candidate terms"),
});

export const SentenceSchema = z.object({
  japanese: z.string().describe("The Japanese text of the sentence"),
  english: z.string().describe("The English translation of the sentence"),
  reading: z.string().describe("The reading of the sentence in kana"),
  english_context: z
    .string()
    .describe("A short English context for the sentence"),
});

export const SentencesResponseSchema = z.object({
  sentences: z.array(SentenceSchema).describe("The generated sentences"),
  term_reading: z.string().describe("The reading of the term in kana"),
  term_english_context: z
    .string()
    .describe(
      "A short English description of how this term is most used in general. Compare and contrast the closest other term."
    ),
  difference_context: DifferenceContextSchema,
});

export type DifferenceContextType = z.infer<typeof DifferenceContextSchema>;
export type SentencesResponseType = z.infer<typeof SentencesResponseSchema>;
export type SentenceSchemaType = z.infer<typeof SentenceSchema>;

export type SentenceSearchFn = (
  term: string,
  other_terms: string[],
  max_sentences: number
) => Promise<SentencesResponseType | null>;
