import { Deck } from "anki-apkg-parser";
import { UNPACK_PATH } from "./rebuild_unpack";
import { analyze, analyzeSync, tokenizeSync } from "@enjoyjs/node-mecab";

// To rebuild the model fields, run the following code:
// for (const model of Object.values(models)) {
//   console.log(model.flds.map((fld) => fld.name));
// }
enum ModelFields {
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
  furigana: string | undefined;
  eng: string;
  audioNames: string[];
  audioFilenames: string[];
  randomAudioFilename: string;
}

export async function searchSentences(searchTerm: string): Promise<Sentence[]> {
  const deck = new Deck(UNPACK_PATH);

  await deck.dbOpen();

  const notes = await deck.anki21b?.getNotes();

  const media = await deck.getMedia();

  const reverseMedia = Object.fromEntries(
    Object.entries(media).map(([key, value]) => [value, key])
  );

  if (!notes) {
    throw new Error("No notes found");
  }

  const noteFields = Object.values(notes).map((note) =>
    (note.flds as string).split("\x1f")
  );

  const matchedItems = noteFields.filter((note) =>
    note[ModelFields.SentKanji]?.includes(searchTerm)
  );

  return matchedItems.map((item) => {
    const engParts = item[ModelFields.SentEng]?.split(/<br\/?>/);
    const eng1 = engParts?.[0];

    const audioNames = item[ModelFields.SentAudio]?.split(/<br\/?>/);

    const audioFilenames = audioNames
      ?.map((name) => parseSound(name))
      .filter((r) => r !== null)
      .map((r) => reverseMedia[r]);

    const sentence: Sentence = {
      searchTerm,
      sentence: item[ModelFields.SentKanji],
      furigana: item[ModelFields.VocabFurigana],
      eng: eng1,
      audioNames: audioNames,
      audioFilenames: audioFilenames,
      randomAudioFilename:
        audioFilenames?.[Math.floor(Math.random() * audioFilenames.length)]!,
    };

    return sentence;
  });
}
