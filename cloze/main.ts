import { testAnkiConnect } from "../main/ankiconnect";
import { DataPaths } from "../main/IDataItems";
import { loadCsv, saveCsv } from "../main/io";
import {
  generateAndAddCards,
  type AddErrorMessage,
  type AddResult,
} from "./generate_cards";
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

function isGoodAddResult(result: AddResult): result is { nid: number } {
  return "nid" in result;
}

function isBadAddResult(
  result: AddResult
): result is { error: AddErrorMessage } {
  return "error" in result;
}

function assertGoodAddResult(
  result: AddResult
): asserts result is { nid: number } {
  if (!isGoodAddResult(result)) {
    throw new Error(`Expected good result, got bad result: ${result}`);
  }
}

function assertBadAddResult(
  result: AddResult
): asserts result is { error: AddErrorMessage } {
  if (!isBadAddResult(result)) {
    throw new Error(`Expected bad result, got good result: ${result}`);
  }
}

async function main() {
  const deckName = "Clozes";
  const modelName = "ClozeCard";

  const unAddedItems = (await loadCsv<InCsvItem>(DataPaths.inputClozeCsv))
    .filter((item) => item.Error === "")
    .filter((item) => item.ノートID集合 === "");

  const groupedItems = groupBy(unAddedItems, (item) => item.グループ番号);

  const groups = Object.entries(groupedItems).map(([id, item]) => ({
    GroupId: id,
    Items: item,
  }));

  await checkForInputErrors(unAddedItems, groups);

  await testAnkiConnect(deckName, modelName);

  for (const group of groups) {
    console.log(
      `Generating cards for ${group.GroupId} (${group.Items.length} items) ...`
    );

    const results = await generateAndAddCards(deckName, modelName, group);

    const goodResults = Object.entries(results).filter(([_, result]) =>
      isGoodAddResult(result)
    );

    const badResults = Object.entries(results).filter(([_, result]) =>
      isBadAddResult(result)
    );

    console.log(
      `Generated ${goodResults.length} cards: ${goodResults
        .map((r) => r[0])
        .join(",")}`
    );

    for (const [word, result] of goodResults) {
      assertGoodAddResult(result);
      const nid = result.nid;
      console.log(`Card generated for word ${word}: ${nid}`);
      const item = group.Items.find((i) => i.漢字 == word);
      if (item) {
        item.ノートID集合 = nid.toString();
      }
    }

    for (const [word, result] of badResults) {
      assertBadAddResult(result);
      const error = result.error;
      console.log(`Error for word ${word}: ${error}`);
      const item = group.Items.find((i) => i.漢字 == word);
      if (item) {
        item.Error = error ?? "Unknown error";
      }
    }
  }

  await saveCsv(unAddedItems, DataPaths.inputClozeCsv);
}

async function checkForInputErrors(
  items: InCsvItem[],
  groupedItems: InCsvGroup[]
) {
  // Check if any two items have the same word, and print the duplicates
  const duplicates = items.filter(
    (item, index, self) => self.findIndex((t) => t.漢字 === item.漢字) !== index
  );
  if (duplicates.length > 0) {
    throw new Error(
      "Duplicate words found: " + duplicates.map((d) => d.漢字).join(", ")
    );
  }
}

await main();
