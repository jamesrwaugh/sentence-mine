import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import {
  DifferenceContextSchema,
  SentencesResponseSchema,
  type SentenceSearchFn,
} from "./sentence_schema";
import type { MiniNote } from "common/ankiconnect";
import type { AlternativeJson, ClozeNoteFields } from "./add_cards";
import { DataPaths } from "common/IDataItems";
import { join } from "node:path";

export const searchGrok: SentenceSearchFn = async (
  term: string,
  other_terms: string[],
  max_sentences: number
) => {
  let tries = 0;

  while (tries < 3) {
    try {
      const result = await generateObject({
        model: xai("grok-4-fast-non-reasoning"),
        schema: SentencesResponseSchema,
        prompt: `
          Generate ${max_sentences} example sentences in Japanese for the word "${term}". The sentences should reflect the most common usages of the word, and include context to help a non-native speaker understand the nuance. ${other_terms.length > 0 ? "Choose a meaning distinct from these terms: " + other_terms.join(", ") + ". " : ""}
          For the context, give a concise executive explanation why ${term} is the best choice. Contrast why ${other_terms.join(", ")} were not used instead. Be concise with only the differences.
        `,
      });
      return result.object;
    } catch (error) {
      tries += 1;
    }
  }

  throw new Error(`Error generating Grok in ${tries} times for ${term}`);
};

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
        schema: DifferenceContextSchema,
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

export async function generateAudioToFile(text: string): Promise<string> {
  const voices = ["eve", "ara", "rex", "sal", "leo"];
  const voice = voices[Math.floor(Math.random() * voices.length)];
  const filename = `${text}_${voice}_grok.mp3`;

  const res = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: `<fast>${text}</fast>`,
      voice_id: voice,
      output_format: { codec: "mp3", sample_rate: 24000, bit_rate: 128000 },
      language: "ja",
    }),
  });

  if (!res.ok) throw new Error(`TTS error ${res.status}: ${await res.text()}`);

  const buf = Buffer.from(await res.arrayBuffer());

  await Bun.write(join(DataPaths.audioTempFolder, filename), buf);

  return filename;
}

export function confirmXApiSetupOrError() {
  if (!process.env["XAI_API_KEY"]) {
    throw new Error("XAI_API_KEY missing");
  }
}
