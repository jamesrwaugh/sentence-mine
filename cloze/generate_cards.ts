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
  English: AnkiField;
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

export async function addClozeNote(
  deckName: string,
  modelName: string,
  item: Item,
  rtkKeywords: RtkKeywordLine[]
): Promise<number> {
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
      English: sentence.english,
      EnglishContext: sentence.english_context,
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

type ErrorMessage = "no-rtk-keywords" | "no-sentences" | "no-audio";

export async function generateAndAddCards(
  deckName: string,
  modelName: string,
  term: string
): Promise<{ nids: number[] } | { error: ErrorMessage }> {
  await testAnkiConnect(deckName, modelName);

  const rtkKeywords = await GetJouyouRtkKeywords();

  if (rtkKeywords.length === 0) {
    console.log("No RTK keywords found");
    return {
      error: "no-rtk-keywords",
    };
  }

  const sentences = await searchGrok(term, 3);

  if (sentences == null) {
    console.log("No sentences found for ", term);
    return {
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
      error: "no-audio",
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
          termReading: sentences.term_reading,
          sentence,
          termAudioFilename: readingAudioFilename,
          sentenceAudioFilename,
        });
      })
  );

  const items = await Promise.all(generateAudioPromises);

  const nids: number[] = [];

  for (const item of items) {
    const nid = await addClozeNote(deckName, modelName, item, rtkKeywords);
    nids.push(nid);
  }

  return { nids };
}

// await generateAndAddCards("Clozes", "ClozeCard", "条件");
