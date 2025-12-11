import { testAnkiConnect as testAnkiConnectOrThrow } from "../main/ankiconnect";
import { DataPaths } from "../main/IDataItems";
import { loadCsv, saveCsv } from "../main/io";
import {
  generateAndAddCards,
  generateMediaForSingle,
  type AddErrorMessage,
  type AddResult,
} from "./generate_cards";
import { groupBy } from "underscore";
import { addClozeNote, updateExistingGroupIdAlternatives } from "./add_cards";
import { GetJouyouRtkKeywords } from "../main/rtk_keywords";
import { analyze } from "./sudachi";
import { confirmGoogleCloudConnectedOrError as confirmGoogleCloudConnectedOrThrow } from "./google";
import { confirmXApiSetupOrError as confirmXApiSetupOrThrow } from "./grok";
import { tokenizeSync } from "@enjoyjs/node-mecab";

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

  const allItems = await loadCsv<InCsvItem>(DataPaths.inputClozeCsv);

  const noErrorItems = allItems.filter((item) => item.Error === "");

  const groupedItems = groupBy(noErrorItems, (item) => item.グループ番号);

  const groups = Object.entries(groupedItems).map(([id, item]) => ({
    GroupId: id,
    Items: item,
  }));

  await checkForInputErrors(noErrorItems, groups);

  await testExternalConnections(deckName, modelName);

  const newGroups = groups.filter(({ Items }) =>
    Items.every((item) => item.ノートID集合 === "")
  );

  const additionItems = groups
    .filter(
      ({ Items }) =>
        Items.some((item) => item.ノートID集合 === "") &&
        Items.some((item) => item.ノートID集合 !== "")
    )
    .flatMap((g) => g.Items)
    .filter((item) => item.ノートID集合 === "");

  for (const group of newGroups) {
    const result = await addNewGroup(group, deckName, modelName);
    updateCsvLinesInPlace(allItems, group.GroupId, result);
  }

  for (const item of additionItems) {
    const result = await addInAdditionItems(item, deckName, modelName);
    updateCsvLinesInPlace(allItems, item.グループ番号, { [item.漢字]: result });
  }

  await saveCsv(allItems, DataPaths.inputClozeCsv);
}

function updateCsvLinesInPlace(
  allItems: InCsvItem[],
  groupId: string,
  groupResults: Record<string, AddResult>
) {
  const goodResults = Object.entries(groupResults).filter(([_, result]) =>
    isGoodAddResult(result)
  );

  const badResults = Object.entries(groupResults).filter(([_, result]) =>
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
    const item = allItems.find(
      (i) => i.漢字 == word && i.グループ番号 === groupId
    );
    if (item) {
      item.ノートID集合 = nid.toString();
    }
  }

  for (const [word, result] of badResults) {
    assertBadAddResult(result);
    const error = result.error;
    console.log(`Error for word ${word}: ${error}`);
    const item = allItems.find(
      (i) => i.漢字 == word && i.グループ番号 === groupId
    );
    if (item) {
      item.Error = error ?? "Unknown error";
    }
  }
}

async function addInAdditionItems(
  item: InCsvItem,
  deckName: string,
  modelName: string
): Promise<AddResult> {
  console.log(
    `Generating addition cards for ${item.グループ番号}: ${item.漢字}`
  );

  const media = await generateMediaForSingle(item.漢字);

  if (media.error !== undefined) {
    return { error: media.error };
  }

  const newAlts = await updateExistingGroupIdAlternatives(
    deckName,
    item,
    media.sentences[0]?.termReading ?? ""
  );

  const rtkKeywords = await GetJouyouRtkKeywords();

  let anyNid: number | undefined = undefined;

  for (const result of media.sentences) {
    anyNid = await addClozeNote(
      deckName,
      modelName,
      {
        MediaData: result,
        Alternatives: newAlts,
        GroupId: item.グループ番号,
      },
      rtkKeywords
    );
  }

  if (anyNid === undefined) {
    return { error: "data-error" };
  }

  return { nid: anyNid };
}

async function addNewGroup(
  group: { GroupId: string; Items: InCsvItem[] },
  deckName: string,
  modelName: string
): Promise<Record<string, AddResult>> {
  console.log(
    `Generating cards for ${group.GroupId} (${group.Items.length} items) ...`
  );

  return await generateAndAddCards(deckName, modelName, group);
}

async function checkForInputErrors(
  items: InCsvItem[],
  groupedItems: InCsvGroup[]
) {
  for (const group of groupedItems) {
    // Check if any two items have the same word in the same group, and print the duplicates
    const duplicates = group.Items.filter(
      (item, index, self) =>
        self.findIndex((t) => t.漢字 === item.漢字) !== index
    );
    if (duplicates.length > 0) {
      throw new Error(
        `Duplicate words found in group: ${group.GroupId}: ${duplicates
          .map((d) => d.漢字)
          .join(", ")}`
      );
    }
  }
}

async function testExternalConnections(deckName: string, modelName: string) {
  console.log("Testing external connections...");

  // MeCab
  const b = tokenizeSync("今日");
  if (b.length == 0 || b[1]?.feature.reading !== "キョウ") {
    throw new Error("Failed to run MeCab");
  }

  // Sudachi
  const stuff = await analyze("今日");
  if (stuff.length == 0 || stuff[0]?.reading !== "キョウ") {
    throw new Error("Failed to run Sudachi");
  }

  // Google
  await confirmGoogleCloudConnectedOrThrow();

  // Grok
  confirmXApiSetupOrThrow();

  // Anki
  await testAnkiConnectOrThrow(deckName, modelName);

  console.log("OK");
}

await main();
