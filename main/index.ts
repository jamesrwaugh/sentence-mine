import { loadCsv, saveCsv, type InCsvSentenceItem } from "common/csv_io";
import { processAddImage, processAddNewOrUpdateNote } from "./note_actions";
import { loadDataItems } from "common/data_items";
import { DataPaths } from "common/IDataItems";
import { testAnkiConnect } from "common/ankiconnect";
import { Constants } from "common/constants";

async function main() {
  const deckName = Constants.SentenceDeckName;
  const modelName = Constants.SentenceDeckModelName;

  await testAnkiConnect(deckName, modelName);

  const dataItems = await loadDataItems();

  console.log("Loading CSV...");
  const items = await loadCsv<InCsvSentenceItem>(DataPaths.inputSentenceCsv);

  const unadded = items
    .filter((r) => r.Error === "")
    .filter((r) => r.ノートID === "");

  for (const row of unadded) {
    console.log(`New: ${row.漢字} ....`);

    const result = await processAddNewOrUpdateNote(
      deckName,
      modelName,
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

await main(); // 従業員、作業、みかさんとぼくが一つずつ段落を読んで見てと思います
