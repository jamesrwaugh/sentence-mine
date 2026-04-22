import { queryNotes } from "common/ankiconnect";
import { type ClozeNoteFields } from "./add_cards";
import { Constants } from "common/constants";
import { YankiConnect } from "yanki-connect";
import { nameof } from "common/nameof";
import { generateEnglishContextDetailed } from "./grok";

async function main() {
  const notes = await queryNotes<ClozeNoteFields>(
    Constants.ClozeDeckName,
    "EnglishContextDetail:"
  );

  const client = new YankiConnect();

  for (const note of notes) {
    const content = await generateEnglishContextDetailed(note);

    console.log(note.nid);

    await client.note.updateNote({
      note: {
        id: note.nid,
        fields: {
          [nameof<ClozeNoteFields>("EnglishContextDetail")]:
            JSON.stringify(content),
        },
      },
    });
  }
}

await main();
