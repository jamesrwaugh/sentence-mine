import { loadDictformIndex } from "./dictform_index";
import { loadDictionary } from "./dictionary";
import { type IDataItems, DataPaths } from "./IDataItems";
import { GetJouyouRtkKeywords } from "./rtk_keywords";
import { loadSentenceDeck } from "./search_sentence";

function CheckForDataErrors(dataItems: IDataItems) {
  if (Object.keys(dataItems.dictFormIndex).length === 0) {
    throw new Error("Dictform index is empty");
  }

  if (Object.keys(dataItems.dictionary).length === 0) {
    throw new Error("Dictionary is empty");
  }

  if (
    Object.keys(dataItems.deck.notes).length === 0 ||
    Object.keys(dataItems.deck.media).length === 0 ||
    dataItems.deck.noteFields.length === 0
  ) {
    throw new Error("Deck is empty");
  }

  if (dataItems.rtkKeywords.length === 0) {
    throw new Error("RTK keywords is empty");
  }
}

export async function loadDataItems(): Promise<IDataItems> {
  console.log("Loading dictform index...");
  const dictFormIndex = await loadDictformIndex(DataPaths.dictformIndex);

  console.log("Loading dictionary...");
  const dictionary = await loadDictionary();

  console.log("Loading deck...");
  const deck = await loadSentenceDeck();

  console.log("Loading RTK keywords...");
  const rtkKeywords = await GetJouyouRtkKeywords();

  const dataItems: IDataItems = {
    dictFormIndex,
    dictionary,
    deck,
    rtkKeywords,
  };

  CheckForDataErrors(dataItems);

  return dataItems;
}
