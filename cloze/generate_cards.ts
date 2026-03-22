import { searchGrok } from "./grok";
import { tryDownloadTermAudio } from "../common/term_audio";
import { GetJouyouRtkKeywords } from "common/rtk_keywords";
import {
  type SentencesResponseType,
  type SentenceSchemaType,
} from "./sentence_schema";
import { generateAudioToFile } from "./google";
import type { InCsvItem, InCsvGroup } from "./main";
import { uniq } from "underscore";
import { addClozeNote, type AlternativeJson } from "./add_cards";
import { getClozeSentence } from "./get_cloze_sentence";

export interface SentenceMediaData {
  term: string;
  termReading: string;
  sentence: SentenceSchemaType;
  clozedSentence: string;
  termAudioFilename: string;
  previewAudioFilename: string;
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
  | "no-clozed-sentences"
  | "no-audio"
  | "data-error";

export async function generateMediaForGroup(
  group: InCsvGroup
): Promise<ItemIn[]> {
  async function generatePromise(item: InCsvItem) {
    const otherTerms = group.Items.map((item) => item.漢字).filter(
      (term) => term !== item.漢字
    );

    return {
      media: await generateMediaForTerm(item.漢字, otherTerms),
      inCsvItem: item,
    };
  }

  const genPromises = group.Items.map((item) => generatePromise(item));
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

async function generateMediaForOneSentence(
  term: string,
  termReading: string,
  termAudioFilename: string,
  sentence: SentenceSchemaType
): Promise<SentenceMediaData | null> {
  const clozed = await getClozeSentence(term, sentence.japanese);

  if (!clozed.found) {
    return null;
  }

  function getFillerSentence(sentence: string): string {
    return sentence.replace(/{{.*?}}/, "(ナニナニ)");
  }

  const fillerSentence = getFillerSentence(clozed.sentence);

  const previewAudioFilename = await generateAudioToFile(fillerSentence);

  return {
    term: term,
    termReading: termReading,
    clozedSentence: clozed.sentence,
    sentence,
    termAudioFilename: termAudioFilename,
    previewAudioFilename: previewAudioFilename,
  };
}

export async function generateMediaForTerm(
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
    sentences.term_reading
  );

  if (readingAudioFilename == undefined) {
    console.log("No reading audio found for ", term, sentences.term_reading);
    return {
      term: term,
      sentences: [],
      error: "no-audio",
    };
  }

  const generateMediaPromises = sentences.sentences.map((sentence) =>
    generateMediaForOneSentence(
      term,
      sentences.term_reading,
      readingAudioFilename,
      sentence
    )
  );

  const items = (await Promise.all(generateMediaPromises)).filter(
    (sentence) => sentence !== null
  );

  if (items.length === 0) {
    return {
      term: term,
      sentences: [],
      error: "no-clozed-sentences",
    };
  }

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
