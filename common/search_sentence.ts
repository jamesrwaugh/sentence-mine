import { Deck } from "anki-apkg-parser";
import type { DictionaryEntry } from "./dictionary";
import type INote from "anki-apkg-parser/src/core/interfaces/INote";
import {
  DataPaths,
  type IDataItems,
  type IDataItemsSentencesOnly,
} from "./IDataItems";
import { parseAnkiSoundField } from "./audio";
import { analyzeSync } from "./sudachi";

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
    ?.map((name) => parseAnkiSoundField(name))
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

export interface DictNote {
  sentence: Sentence;
  dictionary: DictionaryEntry;
}

export interface SentenceDeck {
  notes: Record<string, INote>;
  media: Record<string /*term*/, string /*filename*/>;
  noteFields: string[][];
}

export async function loadSentenceDeck(): Promise<SentenceDeck> {
  const deck = new Deck(DataPaths.ankidroneDeckFolder);

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

export function findNormalizedForm(searchTerm: string): string | null {
  const item = analyzeSync(searchTerm, { all: true, m: "c" });

  if (item.length === 1) {
    return item[0]?.normalized ?? null;
  }

  const goodPoses = ["形容詞", "動詞", "名詞", "形状詞"];

  const usefulCount = item.filter(
    (x) => x.pos?.pos && goodPoses.includes(x.pos.pos)
  );

  if (usefulCount.length === 1) {
    return usefulCount[0]?.normalized ?? null;
  }

  console.log("Unable to normalize", searchTerm);

  return null;
}

export function searchSentencesOnly(
  searchTerm: string,
  dataItems: IDataItemsSentencesOnly
): { sentences: Sentence[]; normalized: string } | null {
  const { deck, dictFormIndex } = dataItems;

  const { notes, media, noteFields } = deck;

  if (!notes) {
    throw new Error("No notes found");
  }

  const itemNormalized = findNormalizedForm(searchTerm);

  if (!itemNormalized) {
    return null;
  }

  const dictFormIndicies = dictFormIndex[itemNormalized.trim()];

  const matchedItems =
    dictFormIndicies?.map((sentenceIndex) => noteFields[sentenceIndex]!) ?? [];

  if (matchedItems.length === 0) {
    return null;
  }

  const sentences = matchedItems
    .map((item) => makeSentence(searchTerm, item, media))
    .filter((sentence) => sentence !== null);

  return {
    sentences: sentences,
    normalized: itemNormalized,
  };
}

export function searchSentences(
  searchTerm: string,
  dataItems: IDataItems
): DictNote[] {
  const { dictionary } = dataItems;

  const search = searchSentencesOnly(searchTerm, dataItems);

  if (!search) {
    return [];
  }

  const { sentences, normalized } = search;

  const sentencesWDictInfo = sentences
    .map((sentence) => ({
      sentence,
      dictionary: normalized ? dictionary[normalized?.trim()]! : undefined!,
    }))
    .filter((note) => note.dictionary !== undefined);

  return sentencesWDictInfo;
}
