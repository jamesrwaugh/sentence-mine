import { queryNotes, type SentencesNoteFields } from "common/ankiconnect";
import { Constants } from "common/constants";
import { loadDataItems } from "common/data_items";
import { searchSentences } from "common/search_sentence";

async function main() {
  const term = "見え透く";
  const items = await loadDataItems();
  const s = searchSentences(term, items);
  console.log(s);
}

await main();
