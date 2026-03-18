import { loadDataItems } from "common/data_items";
import { searchSentences } from "common/search_sentence";
import { analyze, GetSudachiWords } from "common/sudachi";

async function main() {
  const b = await GetSudachiWords("再現率と適合率を向上させることができます");
  const c = await GetSudachiWords("再現率と適合率を向上させることができます");
  console.log(b);
  console.log(c);
}

await main();
