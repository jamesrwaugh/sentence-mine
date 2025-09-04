import { loadDictformIndex } from "./dictform_index";
import { loadDictionary } from "./dictionary";
import { loadCsv, saveCsv } from "./io";
import { processAddImage, processAddNewOrUpdateNote } from "./note_actions";
import { loadSentenceDeck } from "./search_sentence";

async function main() {
  console.log("Loading dictform index...");
  const dictformIndex = await loadDictformIndex("dictform_index.json");

  console.log("Loading dictionary...");
  const dictionary = await loadDictionary();

  console.log("Loading deck...");
  const deck = await loadSentenceDeck();

  console.log("Loading CSV...");
  const items = await loadCsv();

  const unadded = items
    .filter((r) => r.Error === "")
    .filter((r) => r.ノートID === "");

  for (const row of unadded) {
    console.log(`New: ${row.漢字} ....`);

    const result = await processAddNewOrUpdateNote(
      "Core2.3k Version 3",
      row,
      deck,
      dictionary,
      dictformIndex
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
