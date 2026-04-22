import {
  queryNotes,
  replaceSentenceAudio,
  updateTextFields,
  type SentencesNoteFields,
} from "common/ankiconnect";
import { Constants } from "common/constants";
import { input } from "common/csv_io";
import { loadDataItems } from "common/data_items";
import { nameof } from "common/nameof";
import { searchSentences } from "common/search_sentence";

// Pink flag is used for "New sentence, please."
// Re-choose a sentence for items flagged with Pink

async function main() {
  const dataItems = await loadDataItems();

  const notes = await queryNotes<SentencesNoteFields>(
    Constants.SentenceDeckName,
    "flag:5"
  );

  for (const note of notes) {
    const sentences = searchSentences(note.fields.Word.value, dataItems);

    if (sentences.length > 0) {
      console.log(note.nid, note.fields.Word.value);
      for (const [i, s] of sentences.entries()) {
        console.log(`${i}: ${s.sentence.sentence}`);
      }

      const indexOrNo = await input("Pick which to use ('n' to skip): ");

      if (indexOrNo === null || indexOrNo >= sentences.length) {
        continue;
      }

      const s = sentences[indexOrNo]!;

      await updateTextFields(note.nid, {
        [nameof<SentencesNoteFields>("Sentence")]: s.sentence.sentence,
        [nameof<SentencesNoteFields>("Sentence-English")]: s.sentence.eng,
      });

      await replaceSentenceAudio(note.nid, s.sentence.randomAudioFilename);
    }
  }
}

await main();
