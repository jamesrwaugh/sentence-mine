import type { DictformIndex } from "./dictform_index";
import type { Dictionary } from "./dictionary";
import type { RtkKeywordLine } from "./rtk_keywords";
import type { SentenceDeck } from "./search_sentence";

export interface IDataItems {
  dictFormIndex: DictformIndex;
  dictionary: Dictionary;
  deck: SentenceDeck;
  rtkKeywords: RtkKeywordLine[];
}

export const DataPaths = {
  deckFolder: "./data/deck-folder",
  imageTempFolder: "./data/image-temp",
  audioTempFolder: "./data/audio-temp",
  rtkKeywordsCsv: "./data/kanji-keywords-6th-edition.csv",
  dictformIndex: "./data/dictform_index.json",
  jitendexYomitanFolder: "./data/jitendex-yomitan",
  ankiDroneSentencePackApkg: "./data/Ankidrone Sentence Pack V4.apkg",
  inputCsv: "/home/james/Dropbox/SentenceMine.csv",
};
