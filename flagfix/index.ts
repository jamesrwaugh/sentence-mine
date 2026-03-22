import {
  queryNotes,
  replaceTermAudio,
  type SentencesNoteFields,
} from "common/ankiconnect";
import { Constants } from "common/constants";
import { tryDownloadTermAudio } from "common/term_audio";

async function main() {
  const all = await queryNotes<SentencesNoteFields>(
    Constants.SentenceDeckName,
    "tag:n2"
  );

  for (const note of all) {
    const filename = await tryDownloadTermAudio(
      note.fields.Word.value,
      note.fields.Reading.value
    );

    if (filename) {
      console.log(note.nid, filename);
      await replaceTermAudio(note.nid, filename);
    }
  }
}

async function mains() {
  const filename = await tryDownloadTermAudio("断れる", "ことわれる");
}

await mains();
