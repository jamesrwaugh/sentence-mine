import { queryNotes } from "common/ankiconnect";
import { type ClozeNoteFields } from "./add_cards";
import { Constants } from "common/constants";
import { YankiConnect } from "yanki-connect";
import { nameof } from "common/nameof";
import { generateEnglishContextDetailed, searchGrok } from "./grok";

async function main() {
  const b = await searchGrok(
    "予め",
    ["前もって", "既に", "前に", "先ず", "最初"],
    2
  );
  console.log(JSON.stringify(b));
}

await main();
