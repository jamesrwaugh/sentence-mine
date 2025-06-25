import { Deck } from "anki-apkg-parser";
import { UNPACK_PATH } from "./rebuild_unpack";
import type { Dictionary, DictionaryEntry } from "./dictionary";
import type INote from "anki-apkg-parser/src/core/interfaces/INote";
import type { DictformIndex } from "./dictform_index";

// To rebuild the model fields, run the following code:
// for (const model of Object.values(models)) {
//   console.log(model.flds.map((fld) => fld.name));
// }
export enum ModelFields {
  SentKanji = 0,
  SentFurigana = 1,
  SentEng = 2,
  SentAudio = 3,
  VocabKanji = 4,
  VocabFurigana = 5,
  VocabPitchPattern = 6,
  VocabPitchNum = 7,
  VocabDef = 8,
  VocabAudio = 9,
  Image = 10,
  Notes = 11,
  MakeProductionCard = 12,
  Focus = 13,
}

// [sound:NDL_3159_Male.ogg] -> NDL_3159_Male.ogg
function parseSound(sound: string): string | null {
  const match = sound.match(/\[sound:(.*)\]/);
  if (!match) {
    return null;
  }
  return match[1] ?? null;
}

export interface Sentence {
  searchTerm: string;
  sentence: string;
  eng: string;
  audioNames: string[];
  audioFilenames: string[];
  randomAudioFilename: string;
}

function makeSentence(
  searchTerm: string,
  item: string[],
  reverseMedia: Record<string, string>
): Sentence | null {
  const engParts = item[ModelFields.SentEng]?.split(/<br\/?>/);
  const eng1 = engParts?.[0];

  const audioNames = item[ModelFields.SentAudio]?.split(/<br\/?>/);

  const audioFilenames = audioNames
    ?.map((name) => parseSound(name))
    .filter((r) => r !== null)
    .map((r) => reverseMedia[r]);

  if (
    !eng1 ||
    !audioFilenames ||
    !item[ModelFields.SentKanji] ||
    !audioNames ||
    !audioFilenames ||
    audioFilenames.some((r) => r === undefined)
  ) {
    return null;
  }

  const sentence: Sentence = {
    searchTerm,
    sentence: item[ModelFields.SentKanji],
    eng: eng1,
    audioNames: audioNames,
    audioFilenames: audioFilenames.filter((r) => r !== undefined),
    randomAudioFilename:
      audioFilenames?.[Math.floor(Math.random() * audioFilenames.length)]!,
  };

  return sentence;
}

export interface Note {
  sentence: Sentence;
  dictionary: DictionaryEntry;
}

export interface SentenceDeck {
  notes: Record<string, INote>;
  media: Record<string /*term*/, string /*filename*/>;
  noteFields: string[][];
}

export async function loadSentenceDeck(): Promise<SentenceDeck> {
  const deck = new Deck(UNPACK_PATH);

  await deck.dbOpen();

  const notes = await deck.anki21b?.getNotes();

  if (!notes) {
    throw new Error("No notes found in anki21b - old format?");
  }

  const media = await deck.getMedia();

  const reverseMedia = Object.fromEntries(
    Object.entries(media).map(([key, value]) => [value, key])
  );

  const noteFields = Object.values(notes).map((note) =>
    (note.flds as string).split("\x1f")
  );

  return {
    notes,
    media: reverseMedia,
    noteFields,
  };
}

export async function searchSentences(
  searchTerm: string,
  deck: SentenceDeck,
  dictionary: Dictionary,
  dictformIndex: DictformIndex
): Promise<Note[]> {
  const { notes, media, noteFields } = deck;

  if (!notes) {
    throw new Error("No notes found");
  }

  let matchedItems: string[][] = [];
  const dictFormIndicies = dictformIndex[searchTerm];

  if (dictFormIndicies) {
    matchedItems = dictFormIndicies.map(
      (sentenceIndex) => noteFields[sentenceIndex]!
    );
  } else {
    matchedItems = noteFields.filter((note) =>
      note[ModelFields.SentKanji]?.includes(searchTerm)
    );
  }

  if (matchedItems.length === 0) {
    console.log(`No matched items found for ${searchTerm}`);
    return [];
  }

  const d = matchedItems
    .map((item) => makeSentence(searchTerm, item, media))
    .filter((sentence) => sentence !== null)
    .map((sentence) => ({
      sentence,
      dictionary: dictionary[sentence.searchTerm]!,
    }))
    .filter((note) => note.dictionary !== undefined);

  return d;
}
