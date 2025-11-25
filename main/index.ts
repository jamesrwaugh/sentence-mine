import { loadCsv, saveCsv } from "./io";
import { processAddImage, processAddNewOrUpdateNote } from "./note_actions";
import { loadDataItems } from "./data_items";
import { DataPaths } from "./IDataItems";

interface InCsvItem {
  漢字: string;
  絵: string;
  例文: string;
  ノートID: string;
  NoteImage: string;
  Error: string;
}

async function main() {
  const dataItems = await loadDataItems();

  console.log("Loading CSV...");
  const items = await loadCsv<InCsvItem>(DataPaths.inputSentenceCsv);

  const unadded = items
    .filter((r) => r.Error === "")
    .filter((r) => r.ノートID === "");

  for (const row of unadded) {
    console.log(`New: ${row.漢字} ....`);

    const result = await processAddNewOrUpdateNote(
      "Core2.3k Version 3",
      "core2.3k-anime-card",
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

  await saveCsv(items, DataPaths.inputSentenceCsv);

  console.log("Done");
}

await main();
