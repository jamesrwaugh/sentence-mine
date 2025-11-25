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

const client = new YankiConnect();

export interface ClozeNoteFields {
  Text: AnkiField;
  WordRtkKeywords: AnkiField;
  "Sentence-Audio": AnkiField;
  Picture: AnkiField;
  PictureFront: AnkiField;
  ClozeAudio: AnkiField;
  ClozeAnswer: AnkiField;
  ClozeReading: AnkiField;
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

interface Item {
  term: string;
  termReading: string;
  sentence: z.infer<typeof SentenceSchema>;
  termAudioFilename: string;
  sentenceAudioFilename: string;
}

export async function addNote(
  deckName: string,
  modelName: string,
  item: Item,
  rtkKeywords: RtkKeywordLine[]
) {
  const {
    term,
    termReading,
    sentence,
    termAudioFilename,
    sentenceAudioFilename,
  } = item;

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

  return nid;
}

async function testAnkiConnect(deckName: string, modelName: string) {
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

async function go(
  deckName: string,
  modelname: string,
  term: string,
  reading: string
) {
  await testAnkiConnect(deckName, modelname);

  const rtkKeywords = await GetJouyouRtkKeywords();

  if (rtkKeywords.length === 0) {
    console.log("No RTK keywords found");
    return {
      error: "no-rtk-keywords",
    };
  }

  const readingAudioFilename = await tryDownloadTermAudio(term, reading);

  if (readingAudioFilename == undefined) {
    console.log("No reading audio found for ", term, reading);
    return {
      error: "no-audio",
    };
  }

  const sentences = await searchGrok(term, 5);

  if (sentences == null) {
    console.log("No sentences found for ", term, reading);
    return {
      error: "no-sentences",
    };
  }

  const generateAudioPromises = sentences.sentences.map(
    (sentence) =>
      new Promise<Item>(async (resolve) => {
        const sentenceAudioFilename = await generateAudioToFile(
          sentence.japanese
        );
        resolve({
          term,
          termReading: reading,
          sentence,
          termAudioFilename: readingAudioFilename,
          sentenceAudioFilename,
        });
      })
  );

  const items = await Promise.all(generateAudioPromises);

  for (const item of items) {
    await addNote(deckName, modelname, item, rtkKeywords);
  }
}

await go("Clozes", "ClozeCard", "条件", "じょうけん");
