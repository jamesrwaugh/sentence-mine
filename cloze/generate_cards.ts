import { searchGrok } from "./grok";
import { tryDownloadTermAudio } from "../main/audio";
import { GetJouyouRtkKeywords } from "../main/rtk_keywords";
import type { SentenceSchema } from "./sentence_schema";
import { z } from "zod";
import { generateAudioToFile } from "./google";
import type { InCsvItem, InCsvGroup } from "./main";
import { uniq } from "underscore";
import { addClozeNote, type AlternativeJson } from "./add_cards";
import { shuffle } from "underscore";

export interface SentenceMediaData {
  term: string;
  termReading: string;
  sentence: z.infer<typeof SentenceSchema>;
  termAudioFilename: string;
  sentenceAudioFilename: string;
}

interface SentenceMediaResult {
  word: string;
  sentences: SentenceMediaData[];
  error?: AddErrorMessage;
}

interface ItemIn {
  media: SentenceMediaResult;
  alternatives: AlternativeJson[];
}

export type AddErrorMessage =
  | "no-rtk-keywords"
  | "no-sentences"
  | "no-audio"
  | "data-error";

interface GeneratedA {
  media: SentenceMediaResult;
  inCsvItem: InCsvItem;
}

export async function generateMediaForGroup(
  group: InCsvGroup
): Promise<ItemIn[]> {
  const genPromises = group.Items.map(
    (i) =>
      new Promise<GeneratedA>(async (resolve) =>
        resolve({
          media: await generateMediaForSingle(i.漢字),
          inCsvItem: i,
        })
      )
  );

  const pss = await Promise.all(genPromises);

  const good = pss.filter((p) => p.media.error == undefined);

  const bad = pss.filter((p) => p.media.error != undefined);

  if (bad.length > 0) {
    console.log("Errors: ", bad.map((p) => p.media.error).join(", "));
  }

  const flatWords = good
    .flatMap((p) => p.media.sentences)
    .map((p) => ({
      w: p.term,
      r: p.termReading,
    }));

  const alternatives: AlternativeJson[] = uniq(flatWords, (word) => word.w);

  return good.map((p) => ({
    media: p.media,
    alternatives: alternatives,
  }));
}

export async function generateMediaForSingle(
  term: string
): Promise<SentenceMediaResult> {
  const sentences = await searchGrok(term, 3);

  if (sentences == null) {
    console.log("No sentences found for ", term);
    return {
      word: term,
      sentences: [],
      error: "no-sentences",
    };
  }

  const readingAudioFilename = await tryDownloadTermAudio(
    term,
    sentences?.term_reading
  );

  if (readingAudioFilename == undefined) {
    console.log("No reading audio found for ", term, sentences.term_reading);
    return {
      word: term,
      sentences: [],
      error: "no-audio",
    };
  }

  const generateAudioPromises = sentences.sentences.map(
    (sentence) =>
      new Promise<SentenceMediaData>(async (resolve) => {
        const sentenceAudioFilename = await generateAudioToFile(
          sentence.japanese
        );
        resolve({
          term,
          termReading: sentences.term_reading,
          sentence,
          termAudioFilename: readingAudioFilename,
          sentenceAudioFilename,
        });
      })
  );

  const items = await Promise.all(generateAudioPromises);

  return {
    word: term,
    sentences: items,
    error: undefined,
  };
}

export type AddResult =
  | {
      error: AddErrorMessage;
    }
  | {
      nid: number;
    };

export async function generateAndAddCards(
  deckName: string,
  modelName: string,
  group: InCsvGroup
): Promise<Record<string, AddResult>> {
  const results: Record<string, AddResult> = {};

  const rtkKeywords = await GetJouyouRtkKeywords();

  const groupResults = await generateMediaForGroup(group);

  groupResults
    .filter((p) => p.media.error != undefined)
    .forEach((p) => {
      results[p.media.word] = { error: p.media.error! };
    });

  for (const { media, alternatives } of groupResults.filter(
    (p) => p.media.error == undefined
  )) {
    for (const result of media.sentences) {
      const nid = await addClozeNote(
        deckName,
        modelName,
        {
          MediaData: result,
          Alternatives: alternatives,
          GroupId: group.GroupId,
        },
        rtkKeywords
      );
      results[result.term] = { nid };
    }
  }

  return results;
}
