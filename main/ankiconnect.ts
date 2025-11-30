import { YankiConnect } from "yanki-connect";
import type { DictNote } from "./search_sentence";
import type { DictionaryEntry } from "./dictionary";
import {
  FindRtkKeywordsJoinedComma,
  type RtkKeywordLine,
} from "./rtk_keywords";
import { DataPaths } from "./IDataItems";
import { join, resolve } from "node:path";

const client = new YankiConnect();

export interface NoteWithAudio {
  note: DictNote;
  audioFilename: string;
}

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
  const sentenceAudioPath = join(DataPaths.deckFolder, sentenceAudioFilename);

  const audioPath = join(DataPaths.audioTempFolder, audioFilename);

  return {
    absoluteSentenceAudioPath: resolve(process.cwd(), sentenceAudioPath),
    absoluteAuthPath: resolve(process.cwd(), audioPath),
  };
}

export async function addNote(
  deckName: string,
  modelName: string,
  noteWithAudio: NoteWithAudio,
  rtkKeywords: RtkKeywordLine[]
) {
  const { note, audioFilename } = noteWithAudio;

  const { absoluteSentenceAudioPath, absoluteAuthPath } = resolveAudioPaths(
    audioFilename,
    note.sentence.randomAudioFilename
  );

  const item: Parameters<typeof client.note.addNote>[0]["note"] = {
    deckName,
    modelName,
    fields: {
      Word: note.sentence.searchTerm,
      Reading: note.dictionary.reading,
      Glossary: makeGlossary(note.dictionary.glossary),
      Sentence: note.sentence.sentence,
      "Sentence-English": note.sentence.eng,
      WordRtkKeywords: FindRtkKeywordsJoinedComma(
        note.sentence.searchTerm,
        rtkKeywords
      ),
    },
    audio: [
      {
        filename: `${note.sentence.searchTerm}_sentence_${note.sentence.randomAudioFilename}.mp3`,
        path: absoluteSentenceAudioPath,
        fields: ["Sentence-Audio"],
      },
      {
        filename: `${note.sentence.searchTerm}_reading.mp3`,
        path: absoluteAuthPath,
        fields: ["Audio"],
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
    note: item,
  });

  return nid;
}

export async function updateNote(
  existingNid: number,
  noteWithAudio: NoteWithAudio
): Promise<null> {
  const { note, audioFilename } = noteWithAudio;

  const { absoluteSentenceAudioPath, absoluteAuthPath } = resolveAudioPaths(
    audioFilename,
    note.sentence.randomAudioFilename
  );

  const item: Parameters<typeof client.note.updateNote>[0]["note"] = {
    id: existingNid,
    fields: {
      Word: note.sentence.searchTerm,
      Reading: note.dictionary.reading,
      Glossary: makeGlossary(note.dictionary.glossary),
      Sentence: note.sentence.sentence,
      "Sentence-English": note.sentence.eng,
    },
    audio: [
      {
        filename: `${note.sentence.searchTerm}_sentence_${note.sentence.randomAudioFilename}.mp3`,
        path: absoluteSentenceAudioPath,
        replace: true,
        fields: ["Sentence-Audio"],
      },
      {
        filename: `${note.sentence.searchTerm}_reading.mp3`,
        path: absoluteAuthPath,
        replace: true,
        fields: ["Audio"],
      },
    ],
    tags: ["mined"],
  };

  const nid = await client.note.updateNote({
    note: item,
  });

  return nid;
}

export async function addImage(nid: number, kanji: string, image: string) {
  const imagePath = join(DataPaths.imageTempFolder, image);
  const imageData = await Bun.file(imagePath).arrayBuffer();
  const imageBase64 = Buffer.from(imageData).toString("base64");

  await client.note.updateNote({
    note: {
      fields: {},
      picture: [
        {
          filename: `${kanji}_${image}`,
          data: imageBase64,
          replace: true,
          fields: ["Picture"],
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

export interface MiniNote<TFieldType> {
  id: number;
  fields: TFieldType;
}

export type AnkiField = {
  order: number;
  value: string;
};

export async function queryNotes<TFieldType>(
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
    id: note.noteId,
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
