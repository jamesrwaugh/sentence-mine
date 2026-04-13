import {
  queryNotes,
  type SentencesNoteFields,
  replaceTermAudio,
  updateTextFields,
} from "common/ankiconnect";
import { Constants } from "common/constants";
import { loadDictionary } from "common/dictionary";
import { nameof } from "common/nameof";
import { findNormalizedForm } from "common/search_sentence";
import { tryDownloadTermAudio } from "common/term_audio";

// This was used to update old / incorrect readings in words
// which originally pulled from the dictionary without first
// sorting by score, for most common reading first,
// so it would mismatch the audio.

async function updateBlueFlaggedTermReadingsWithNewDictEntry() {
  const dictionary = await loadDictionary();

  const notes = await queryNotes<SentencesNoteFields>(
    Constants.SentenceDeckName,
    "flag:4" // Blue flag
  );

  for (const note of notes) {
    const normal = findNormalizedForm(note.fields.Word.value);

    if (!normal) {
      console.log("No normalized for", note.fields.Word.value);
      continue;
    }

    const newDictEntry = dictionary[normal.trim()];

    if (!newDictEntry) {
      console.log("No dict for", normal.trim());
      continue;
    }

    // if (newDictEntry.reading === note.fields.Reading.value) {
    //   continue;
    // }

    console.log(
      note.fields.Word.value,
      "|",
      note.fields.Reading.value,
      "--->",
      newDictEntry.reading
    );

    const filename = await tryDownloadTermAudio(
      note.fields.Word.value,
      newDictEntry.reading
    );

    if (!filename) {
      console.log(
        "No audio for",
        note.fields.Word.value,
        "/",
        newDictEntry.reading
      );
      continue;
    }

    await replaceTermAudio(note.nid, filename);

    await updateTextFields(note.nid, {
      [nameof<SentencesNoteFields>("Reading")]: newDictEntry.reading,
    });
  }
}

await updateBlueFlaggedTermReadingsWithNewDictEntry();
