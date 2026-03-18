import { YankiConnect } from "yanki-connect";
import type { DictionaryEntry } from "./dictionary";
import { DataPaths } from "./IDataItems";
import { GetSudachiWords } from "./sudachi";
import {
  type RtkKeywordLine,
  FindRtkKeywordsJoinedComma,
} from "./rtk_keywords";
import { join, resolve } from "node:path";
import type { DictNote } from "./search_sentence";
import { nameof } from "./nameof";

export interface SentencesNoteFields {
  Word: AnkiField;
  Reading: AnkiField;
  Glossary: AnkiField;
  Sentence: AnkiField;
  "Sentence-English": AnkiField;
  Picture: AnkiField;
  Audio: AnkiField;
  "Sentence-Audio": AnkiField;
  Hint: AnkiField;
  WordRtkKeywords: AnkiField;
}

export async function getWordsInMatureCards(
  deckName: string
): Promise<Set<string>> {
  const notes = await queryNotes<SentencesNoteFields>(
    deckName,
    "-is:suspended prop:ivl>21"
  );

  const wordsInSentencesPs = notes
    .map((note) => note.fields.Sentence.value)
    .map((sentence) => GetSudachiWords(sentence));

  const wordsInSentences = (await Promise.all(wordsInSentencesPs)).flat();

  const uniqueWords = new Set(wordsInSentences);

  return uniqueWords;
}

const client = new YankiConnect();

function makeGlossary(glossary: DictionaryEntry["glossary"]): string {
  const glossaryMap: Record<string, string[]> = {};

  for (const g of glossary) {
    glossaryMap[g.id] ??= [];
    glossaryMap[g.id]!.push(g.meaning);
  }

  return Object.entries(glossaryMap)
    .map(([id, meanings], index) => `${index + 1}.  ${meanings.join(", ")}`)
    .join("<br>");
}

function resolveAudioPaths(
  audioFilename: string,
  sentenceAudioFilename: string
) {
  const sentenceAudioPath = join(
    DataPaths.ankidroneDeckFolder,
    sentenceAudioFilename
  );

  const audioPath = join(DataPaths.audioTempFolder, audioFilename);

  return {
    absoluteSentenceAudioPath: resolve(process.cwd(), sentenceAudioPath),
    absoluteAuthPath: resolve(process.cwd(), audioPath),
  };
}

export interface NoteWithAudio {
  note: DictNote;
  termAudioFilename: string;
}

export async function addNote(
  deckName: string,
  modelName: string,
  noteWithAudio: NoteWithAudio,
  rtkKeywords: RtkKeywordLine[],
  tags: string[] = []
) {
  const { note, termAudioFilename } = noteWithAudio;

  const { absoluteSentenceAudioPath, absoluteAuthPath } = resolveAudioPaths(
    termAudioFilename,
    note.sentence.randomAudioFilename
  );

  type Fields = SentencesNoteFields;

  const item: Parameters<typeof client.note.addNote>[0]["note"] = {
    deckName,
    modelName,
    fields: {
      [nameof<Fields>("Word")]: note.sentence.searchTerm,
      [nameof<Fields>("Reading")]: note.dictionary.reading,
      [nameof<Fields>("Glossary")]: makeGlossary(note.dictionary.glossary),
      [nameof<Fields>("Sentence")]: note.sentence.sentence,
      [nameof<Fields>("Sentence-English")]: note.sentence.eng,
      [nameof<Fields>("WordRtkKeywords")]: FindRtkKeywordsJoinedComma(
        note.sentence.searchTerm,
        rtkKeywords
      ),
    },
    audio: [
      {
        filename: `${note.sentence.searchTerm}_sentence_${note.sentence.randomAudioFilename}.mp3`,
        path: absoluteSentenceAudioPath,
        fields: [nameof<Fields>("Sentence-Audio")],
      },
      {
        filename: `${note.sentence.searchTerm}_reading.mp3`,
        path: absoluteAuthPath,
        fields: [nameof<Fields>("Audio")],
      },
    ],
    tags: ["mined", ...tags],
    options: {
      duplicateScope: "deck",
      duplicateScopeOptions: {
        deckName: deckName,
      },
    },
  };

  const nid = await client.note.addNote({
    note: item,
  });

  return nid;
}

export async function updateNote(
  existingNid: number,
  noteWithAudio: NoteWithAudio
): Promise<null> {
  const { note, termAudioFilename: audioFilename } = noteWithAudio;

  const { absoluteSentenceAudioPath, absoluteAuthPath } = resolveAudioPaths(
    audioFilename,
    note.sentence.randomAudioFilename
  );

  type Fields = SentencesNoteFields;

  const item: Parameters<typeof client.note.updateNote>[0]["note"] = {
    id: existingNid,
    fields: {
      [nameof<Fields>("Word")]: note.sentence.searchTerm,
      [nameof<Fields>("Reading")]: note.dictionary.reading,
      [nameof<Fields>("Glossary")]: makeGlossary(note.dictionary.glossary),
      [nameof<Fields>("Sentence")]: note.sentence.sentence,
      [nameof<Fields>("Sentence-English")]: note.sentence.eng,
    },
    audio: [
      {
        filename: `${note.sentence.searchTerm}_sentence_${note.sentence.randomAudioFilename}.mp3`,
        path: absoluteSentenceAudioPath,
        replace: true,
        fields: [nameof<Fields>("Sentence-Audio")],
      },
      {
        filename: `${note.sentence.searchTerm}_reading.mp3`,
        path: absoluteAuthPath,
        replace: true,
        fields: [nameof<Fields>("Audio")],
      },
    ],
    tags: ["mined"],
  };

  const nid = await client.note.updateNote({
    note: item,
  });

  return nid;
}

export async function addImage(
  nid: number,
  kanji: string,
  imageFilename: string
) {
  const imagePath = join(DataPaths.imageTempFolder, imageFilename);
  const imageData = await Bun.file(imagePath).arrayBuffer();
  const imageBase64 = Buffer.from(imageData).toString("base64");

  await client.note.updateNote({
    note: {
      fields: {},
      picture: [
        {
          filename: `${kanji}_${imageFilename}`,
          data: imageBase64,
          replace: true,
          fields: [nameof<SentencesNoteFields>("Picture")],
        },
      ],
      id: nid,
    },
  });
}

export async function searchFirstNoteId(
  deckName: string,
  vocabTerm: string
): Promise<number | undefined> {
  const notes = await client.note.findNotes({
    query: `"deck:${deckName}" "Word:${vocabTerm}"`,
  });

  return notes[0];
}

type AllAnkiFields<T> = {
  [P in keyof T]: AnkiField;
};

export interface MiniNote<TFieldType extends AllAnkiFields<TFieldType>> {
  nid: number;
  fields: TFieldType;
}

export type AnkiField = {
  order: number;
  value: string;
};

export async function queryNotes<TFieldType extends AllAnkiFields<TFieldType>>(
  deckName: string,
  query: string
): Promise<MiniNote<TFieldType>[]> {
  const noteIds = await client.note.findNotes({
    query: `deck:"${deckName}" ${query}`,
  });

  const notes = await client.note.notesInfo({
    notes: noteIds,
  });

  return notes.map((note) => ({
    nid: note.noteId,
    fields: note.fields as unknown as TFieldType,
  }));
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
