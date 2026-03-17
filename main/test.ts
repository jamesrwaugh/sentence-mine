import { loadDataItems } from "common/data_items";
import { searchSentences } from "common/search_sentence";

async function main() {
  const items = await loadDataItems();
  const b = searchSentences("選挙", items);
  console.log(b);
}

await main();
