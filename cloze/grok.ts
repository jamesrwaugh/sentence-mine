import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import { ResponseSchema, type SentenceSearchFn } from "./sentence_schema";

export const searchGrok: SentenceSearchFn = async (
  term: string,
  other_terms: string[],
  max_sentences: number
) => {
  try {
    const result = await generateObject({
      model: xai("grok-4-fast-non-reasoning"),
      schema: ResponseSchema,
      prompt: `
          Generate ${max_sentences} example sentences in Japanese for the word "${term}". The sentences should reflect the most common usages of the word, and include context to help a non-native speaker understand the nuance. ${other_terms.length > 0 ? "Choose a meaning distinct from these terms: " + other_terms.join(", ") + "." : ""}
        `,
    });

    return result.object;
  } catch (error) {
    console.error("Error searching Grok:", error);
    return null;
  }
};

export function confirmXApiSetupOrError() {
  if (!process.env["XAI_API_KEY"]) {
    throw new Error("XAI_API_KEY missing");
  }
}
