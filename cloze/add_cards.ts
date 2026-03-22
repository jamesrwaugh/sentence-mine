import { YankiConnect } from "yanki-connect";
import { DataPaths } from "common/IDataItems";
import {
  type RtkKeywordLine,
  FindRtkKeywordsJoinedComma,
} from "common/rtk_keywords";
import { join, resolve } from "node:path";
import type { SentenceMediaData } from "./generate_cards";
import { nameof } from "common/nameof";
import type { InCsvItem } from "./main";
import { type AnkiField, queryNotes } from "common/ankiconnect";

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
  AlternativesJson: AnkiField;
  GroupId: AnkiField;
  PreviewAudio: AnkiField;
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
    term: term,
    termReading: termReading,
    sentence,
    termAudioFilename,
    previewAudioFilename,
    clozedSentence,
  } = MediaData;

  const { absoluteSentenceAudioPath, absoluteTermAudioPath } =
    resolveAudioPaths(termAudioFilename, previewAudioFilename);

  type T = ClozeNoteFields;

  const noteItem: Parameters<typeof client.note.addNote>[0]["note"] = {
    deckName,
    modelName,
    fields: {
      [nameof<T>("Text")]: clozedSentence,
      [nameof<T>("WordRtkKeywords")]: FindRtkKeywordsJoinedComma(
        term,
        rtkKeywords
      ),
      [nameof<T>("ClozeAnswer")]: term,
      [nameof<T>("ClozeReading")]: termReading,
      [nameof<T>("English")]: sentence.english,
      [nameof<T>("EnglishContext")]: sentence.english_context,
      [nameof<T>("AlternativesJson")]: JSON.stringify(Alternatives),
      [nameof<T>("GroupId")]: GroupId,
    },
    audio: [
      {
        filename: `${term}_preview_${previewAudioFilename}.mp3`,
        path: absoluteSentenceAudioPath,
        fields: [nameof<T>("PreviewAudio")],
      },
      {
        filename: `${term}_reading.mp3`,
        path: absoluteTermAudioPath,
        fields: [nameof<T>("ClozeAudio")],
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
    groupNotes[0].fields.AlternativesJson.value.length === 0
  ) {
    throw new Error(
      `No existing notes found for group ${newItem.グループ番号}`
    );
  }

  const oldAlts: AlternativeJson[] = JSON.parse(
    groupNotes[0].fields.AlternativesJson.value
  );

  // Already in, nothing to do
  if (oldAlts.find((a) => a.w === newItem.漢字 && a.r === newItemReading)) {
    return oldAlts;
  }

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
          [nameof<ClozeNoteFields>("AlternativesJson")]:
            JSON.stringify(newAlts),
        },
      },
    });
  }

  return newAlts;
}
