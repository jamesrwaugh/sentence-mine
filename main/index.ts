import { loadDictformIndex } from "./dictform_index";
import { loadDictionary } from "./dictionary";
import { DataPaths, type IDataItems } from "./IDataItems";
import { loadCsv, saveCsv } from "./io";
import { processAddImage, processAddNewOrUpdateNote } from "./note_actions";
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

async function main() {
  console.log("Loading dictform index...");
  const dictFormIndex = await loadDictformIndex(DataPaths.dictformIndex);

  console.log("Loading dictionary...");
  const dictionary = await loadDictionary();

  console.log("Loading deck...");
  const deck = await loadSentenceDeck();

  console.log("Loading CSV...");
  const items = await loadCsv();

  console.log("Loading RTK keywords...");
  const rtkKeywords = await GetJouyouRtkKeywords();

  const dataItems: IDataItems = {
    dictFormIndex,
    dictionary,
    deck,
    rtkKeywords,
  };

  CheckForDataErrors(dataItems);

  const unadded = items
    .filter((r) => r.Error === "")
    .filter((r) => r.ノートID === "");

  for (const row of unadded) {
    console.log(`New: ${row.漢字} ....`);

    const result = await processAddNewOrUpdateNote(
      "Core2.3k Version 3",
      row,
      dataItems
    );

    if ("nid" in result) {
      row.ノートID = result.nid.toString();
      row.例文 = result.sentence;
      row.Error = "";
    } else {
      console.log("No result", result);
      row.Error = result.error;
    }
  }

  const addedWithImageUpdates = items
    .filter((r) => r.Error === "")
    .filter((r) => r.ノートID !== "" && r.絵 !== "" && r.NoteImage !== r.絵);

  for (const row of addedWithImageUpdates) {
    console.log(`New Image: ${row.漢字} ....`);
    const result = await processAddImage(row);
    if (result) {
      row.NoteImage = row.絵;
    }
  }

  await saveCsv(items);

  console.log("Done");
}

await main();
