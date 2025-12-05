import { YankiConnect } from "yanki-connect";
import { queryNotes, type AnkiField } from "../main/ankiconnect";
import { DataPaths } from "../main/IDataItems";
import {
  type RtkKeywordLine,
  FindRtkKeywordsJoinedComma,
} from "../main/rtk_keywords";
import { join, resolve } from "node:path";
import type {
  AddErrorMessage,
  AddResult,
  SentenceMediaData,
} from "./generate_cards";
import { analyze } from "./sudachi";
import { nameof } from "./nameof";
import type { InCsvItem } from "./main";

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

  const { sentence: clozedSentence, found } = await getClozeSentence(
    term,
    sentence.japanese
  );

  const noteItem: Parameters<typeof client.note.addNote>[0]["note"] = {
    deckName,
    modelName,
    fields: {
      Text: clozedSentence,
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
    tags: ["mined", ...(!found ? ["cnf"] : [])],
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

async function getNormalizedFormMaybe(term: string) {
  const rawTokens = await analyze(term, { all: true });
  const a = rawTokens.find((t) => t.surface == term);
  return a?.normalized ?? a?.dictionary ?? term;
}

export async function getClozeSentence(term: string, sentence: string) {
  const termNormalized = await getNormalizedFormMaybe(term);
  const rawTokens = await analyze(sentence, { all: true });

  // console.log(termNormalized, "->", rawTokens);

  const badPos = ["BOS/EOS", "BOS", "EOS"];

  const cleanTokens = rawTokens.filter((t) =>
    t.surface ? !badPos.includes(t.surface) : true
  );

  let found = false;

  const clozedSentence = cleanTokens.reduce((acc, curr) => {
    if (curr.normalized === termNormalized) {
      found = true;
      return `${acc}{{c1::${curr.surface}}}`;
    }
    return `${acc}${curr.surface}`;
  }, "");

  return {
    sentence: clozedSentence,
    found,
  };
}

export async function updateExistingGroupIdAlternatives(
  deckName: string,
  newItem: InCsvItem,
  newItemReading: string
): Promise<AlternativeJson[]> {
  const groupNotes = await queryNotes<ClozeNoteFields>(
    deckName,
    `${nameof<ClozeNoteFields>("GroupId")}:${newItem.グループ番号}`
  );

  if (
    groupNotes[0] === undefined ||
    groupNotes[0].fields.AlternativeJson.value.length === 0
  ) {
    throw new Error(
      `No existing notes found for group ${newItem.グループ番号}`
    );
  }

  const oldAlts: AlternativeJson[] = JSON.parse(
    groupNotes[0].fields.AlternativeJson.value
  );

  const newAlts: AlternativeJson[] = [
    ...oldAlts,
    { w: newItem.漢字, r: newItemReading },
  ];

  const client = new YankiConnect();

  for (const note of groupNotes) {
    await client.note.updateNote({
      note: {
        id: note.nid,
        fields: {
          [nameof<ClozeNoteFields>("AlternativeJson")]: JSON.stringify(newAlts),
        },
      },
    });
  }

  return newAlts;
}
