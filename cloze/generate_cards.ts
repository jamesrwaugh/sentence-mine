import { YankiConnect } from "yanki-connect";
import { type AnkiField } from "../main/ankiconnect";
import { searchGrok } from "./grok";
import { tryDownloadTermAudio } from "../main/audio";
import {
  FindRtkKeywordsJoinedComma,
  GetJouyouRtkKeywords,
  type RtkKeywordLine,
} from "../main/rtk_keywords";
import { join, resolve } from "node:path";
import { DataPaths } from "../main/IDataItems";
import type { SentenceSchema } from "./sentence_schema";
import { z } from "zod";
import { generateAudioToFile } from "./google";
import type { InCsvItem, InCsvGroup } from "./main";

const client = new YankiConnect();

interface AlternativeJson {
  w: string;
  r: string;
}

export interface ClozeNoteFields {
  Text: AnkiField;
  WordRtkKeywords: AnkiField;
  "Sentence-Audio": AnkiField;
  Picture: AnkiField;
  English: AnkiField;
  EnglishContext: AnkiField;
  ClozeAudio: AnkiField;
  ClozeAnswer: AnkiField;
  ClozeReading: AnkiField;
  AlternativeJson: AnkiField;
  GroupId: AnkiField;
}

function resolveAudioPaths(
  termAudioFilename: string,
  sentenceAudioFilename: string
) {
  const sentenceAudioPath = join(
    DataPaths.audioTempFolder,
    sentenceAudioFilename
  );

  const audioPath = join(DataPaths.audioTempFolder, termAudioFilename);

  return {
    absoluteSentenceAudioPath: resolve(process.cwd(), sentenceAudioPath),
    absoluteTermAudioPath: resolve(process.cwd(), audioPath),
  };
}

interface SentenceMediaData {
  term: string;
  termReading: string;
  sentence: z.infer<typeof SentenceSchema>;
  termAudioFilename: string;
  sentenceAudioFilename: string;
}

interface SentenceMediaResult {
  word: string;
  sentences: SentenceMediaData[];
  error?: ErrorMessage;
}

interface ItemIn {
  media: SentenceMediaResult;
  alternatives: AlternativeJson[];
}

export async function addClozeNote(
  deckName: string,
  modelName: string,
  item: {
    MediaData: SentenceMediaData;
    GroupId: string;
    Alternatives: AlternativeJson[];
  },
  rtkKeywords: RtkKeywordLine[]
): Promise<number> {
  const { MediaData, Alternatives, GroupId } = item;

  const {
    term,
    termReading,
    sentence,
    termAudioFilename,
    sentenceAudioFilename,
  } = MediaData;

  const { absoluteSentenceAudioPath, absoluteTermAudioPath } =
    resolveAudioPaths(termAudioFilename, sentenceAudioFilename);

  const noteItem: Parameters<typeof client.note.addNote>[0]["note"] = {
    deckName,
    modelName,
    fields: {
      Text: sentence.japanese,
      WordRtkKeywords: FindRtkKeywordsJoinedComma(term, rtkKeywords),
      ClozeAnswer: term,
      ClozeReading: termReading,
      English: sentence.english,
      EnglishContext: sentence.english_context,
      AlternativeJson: JSON.stringify(Alternatives),
      GroupId: GroupId,
    },
    audio: [
      {
        filename: `${term}_sentence_${sentenceAudioFilename}.mp3`,
        path: absoluteSentenceAudioPath,
        fields: ["Sentence-Audio"],
      },
      {
        filename: `${term}_reading.mp3`,
        path: absoluteTermAudioPath,
        fields: ["ClozeAudio"],
      },
    ],
    tags: ["mined"],
    options: {
      duplicateScope: "deck",
      duplicateScopeOptions: {
        deckName: deckName,
      },
    },
  };

  const nid = await client.note.addNote({
    note: noteItem,
  });

  if (nid == null) {
    throw new Error("No nid");
  }

  return nid;
}

export async function testAnkiConnect(deckName: string, modelName: string) {
  const stats = await client.deck.getDeckStats({
    decks: [deckName],
  });

  if (Object.values(stats).find((s) => s.name === deckName) == undefined) {
    throw new Error("Deck not found: " + deckName);
  }

  const modelNames = await client.model.modelNames();

  if (!modelNames.includes(modelName)) {
    throw new Error("Model not found: " + modelName);
  }
}

type ErrorMessage = "no-rtk-keywords" | "no-sentences" | "no-audio";

interface GeneratedA {
  media: SentenceMediaResult;
  inCsvItem: InCsvItem;
}

function assertDataNotError(
  value: Awaited<ReturnType<typeof generateMediaForSingle>>
): asserts value is SentenceMediaResult {
  if ("error" in value) throw new Error("Error: " + value.error);
}

async function generateMediaForGroup(group: InCsvGroup): Promise<ItemIn[]> {
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

  const flatGood = good.flatMap((p) => p.media.sentences);

  const alternatives: AlternativeJson[] = flatGood.map((p) => ({
    w: p.term,
    r: p.termReading,
  }));

  return good.map((p) => ({
    media: p.media,
    alternatives: alternatives,
  }));
}

async function generateMediaForSingle(
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

export async function generateAndAddCards(
  deckName: string,
  modelName: string,
  group: InCsvGroup
): Promise<{ nids: number[]; groupResults: ItemIn[] }> {
  const nids: number[] = [];

  const rtkKeywords = await GetJouyouRtkKeywords();

  const groupResults = await generateMediaForGroup(group);

  for (const { media, alternatives } of groupResults) {
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
      nids.push(nid);
    }
  }

  return { nids, groupResults };
}

// await generateAndAddCards("Clozes", "ClozeCard", "条件");
