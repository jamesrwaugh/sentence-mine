import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import {
  SentencesResponseSchema,
  type SentenceSearchFn,
} from "./sentence_schema";
import { z } from "zod";
import type { MiniNote } from "common/ankiconnect";
import type { AlternativeJson, ClozeNoteFields } from "./add_cards";

export const searchGrok: SentenceSearchFn = async (
  term: string,
  other_terms: string[],
  max_sentences: number
) => {
  try {
    const result = await generateObject({
      model: xai("grok-4-fast-non-reasoning"),
      schema: SentencesResponseSchema,
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

const EnglishChoicesObject = z.object({
  w: z.string().describe("The word."),
  r: z
    .string()
    .describe(
      'A single, short phrase why the word does not fit the sentence. For example, "Too strict."'
    ),
});

const EnglishContextSchema = z.object({
  summary: z
    .string()
    .describe("Brief explanation of why the term best fits this sentence."),
  others: z.array(EnglishChoicesObject).describe("The other candidate terms"),
});

export async function generateEnglishContextDetailed(
  note: MiniNote<ClozeNoteFields>
) {
  interface A {
    nid: number;
    sentence: string;
    choice: string;
    alts: string[];
  }

  const a: A = {
    nid: note.nid,
    sentence: note.fields.Text.value.replace("{{c1::", "").replace("}}", ""),
    choice: note.fields.ClozeAnswer.value,
    alts: (JSON.parse(note.fields.AlternativesJson.value) as AlternativeJson[])
      .map((x) => x.w)
      .filter((d) => d !== note.fields.ClozeAnswer.value),
  };

  let tries = 0;

  while (tries < 3) {
    try {
      const result = await generateObject({
        model: xai("grok-4-fast-non-reasoning"),
        schema: EnglishContextSchema,
        prompt: `Give a concise executive explanation why \"${a.choice}\" is used in the Japanese sentence ${a.sentence}. Contrast why ${a.alts.join(", ")} were not used instead. Be concise with only the differences.`,
      });

      return result.object;
    } catch (ex) {
      tries += 1;
    }
  }

  throw new Error(
    `Error generating Grok EnglishContext for ${note.nid} \ ${note.fields.ClozeAnswer.value}`
  );
}

export function confirmXApiSetupOrError() {
  if (!process.env["XAI_API_KEY"]) {
    throw new Error("XAI_API_KEY missing");
  }
}
