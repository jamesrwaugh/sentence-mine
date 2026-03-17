import { searchGrok } from "./grok";
import { tryDownloadTermAudio } from "../common/term_audio";
import { GetJouyouRtkKeywords } from "common/rtk_keywords";
import type { SentenceSchema } from "./sentence_schema";
import { z } from "zod";
import { generateAudioToFile } from "./google";
import type { InCsvItem, InCsvGroup } from "./main";
import { uniq } from "underscore";
import { addClozeNote, type AlternativeJson } from "./add_cards";

export interface SentenceMediaData {
  term: string;
  termReading: string;
  sentence: z.infer<typeof SentenceSchema>;
  termAudioFilename: string;
  sentenceAudioFilename: string;
}

interface SentenceMediaResult {
  term: string;
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
      new Promise<GeneratedA>(async (resolve) => {
        const otherTerms = group.Items.map((item) => item.漢字).filter(
          (term) => term !== i.漢字
        );
        resolve({
          media: await generateMediaForSingle(i.漢字, otherTerms),
          inCsvItem: i,
        });
      })
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
  term: string,
  other_terms: string[]
): Promise<SentenceMediaResult> {
  const sentences = await searchGrok(term, other_terms, 2);

  if (sentences == null) {
    console.log("No sentences found for ", term);
    return {
      term: term,
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
      term: term,
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
          term: term,
          termReading: sentences.term_reading,
          sentence,
          termAudioFilename: readingAudioFilename,
          sentenceAudioFilename,
        });
      })
  );

  const items = await Promise.all(generateAudioPromises);

  return {
    term: term,
    sentences: items,
    error: undefined,
  };
}

export type AddResult =
  | {
      error: AddErrorMessage;
    }
  | {
      nids: number[];
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
      results[p.media.term] = { error: p.media.error! };
    });

  for (const { media, alternatives } of groupResults.filter(
    (p) => p.media.error == undefined
  )) {
    let nids: number[] = [];
    for (const sentence of media.sentences) {
      const nid = await addClozeNote(
        deckName,
        modelName,
        {
          MediaData: sentence,
          Alternatives: alternatives,
          GroupId: group.GroupId,
        },
        rtkKeywords
      );
      nids = [...nids, nid];
    }
    results[media.term] = { nids: nids };
  }

  return results;
}
