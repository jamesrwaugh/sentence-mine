import { YankiConnect } from "yanki-connect";
import type { AnkiField } from "../main/ankiconnect";
import { DataPaths } from "../main/IDataItems";
import {
  type RtkKeywordLine,
  FindRtkKeywordsJoinedComma,
} from "../main/rtk_keywords";
import { join, resolve } from "node:path";
import type { SentenceMediaData } from "./generate_cards";

export interface AlternativeJson {
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
  const client = new YankiConnect();

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
      AlternativesJson: JSON.stringify(Alternatives),
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
