import { DataPaths } from "../main/IDataItems";
import { loadCsv, saveCsv } from "../main/io";
import { generateAndAddCards, testAnkiConnect } from "./generate_cards";
import { groupBy } from "underscore";

export interface InCsvItem {
  漢字: string;
  グループ番号: string;
  ノートID集合: string;
  NoteImage: string;
  Error: string;
}

export interface InCsvGroup {
  GroupId: string;
  Items: InCsvItem[];
}

async function main() {
  const deckName = "Clozes";
  const modelName = "ClozeCard";

  const items = await loadCsv<InCsvItem>(DataPaths.inputClozeCsv);

  const groupedItems = groupBy(items, (item) => item.グループ番号);

  const groups = Object.entries(groupedItems).map(([id, item]) => ({
    GroupId: id,
    Items: item,
  }));

  await testAnkiConnect(deckName, modelName);

  for (const group of groups) {
    console.log(
      `Generating cards for ${group.GroupId} (${group.Items.length} items) ...`
    );

    const { nids, groupResults } = await generateAndAddCards(
      deckName,
      modelName,
      group
    );

    console.log(`Generated ${nids.length} cards: ${nids.join(",")}`);

    for (const { media } of groupResults.filter(
      (m) => m.media.error != undefined
    )) {
      console.log(`Error for word ${media.word}: ${media.error}`);
      const item = group.Items.find((i) => i.漢字 == media.word);
      if (item) {
        item.Error = media.error ?? "Unknown error";
      }
    }
  }

  await saveCsv(items, DataPaths.inputClozeCsv);
}

await main();
