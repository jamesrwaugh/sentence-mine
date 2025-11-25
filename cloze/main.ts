import { DataPaths } from "../main/IDataItems";
import { loadCsv, saveCsv } from "../main/io";
import { generateAndAddCards } from "./generate_cards";

interface InCsvItem {
  漢字: string;
  例文: string;
  ノートID集合: string;
  NoteImage: string;
  Error: string;
}

async function main() {
  const items = await loadCsv<InCsvItem>(DataPaths.inputClozeCsv);

  for (const item of items) {
    console.log(`Generating cards for ${item.漢字} ...`);
    const result = await generateAndAddCards("Clozes", "ClozeCard", item.漢字);
    if ("error" in result) {
      console.log(`Error: ${result.error}`);
      item.Error = result.error;
    } else {
      console.log(
        `Generated ${result.nids.length} cards: ${result.nids.join(",")}`
      );
      item.ノートID集合 = result.nids.join(",");
    }
  }

  await saveCsv(items, DataPaths.inputClozeCsv);
}

await main();
