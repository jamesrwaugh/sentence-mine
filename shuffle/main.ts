import { loadDataItems } from "common/data_items";
import { searchSentences, type DictNote } from "common/search_sentence";
import { tryDownloadTermAudio } from "common/term_audio";
import { updateTheNote } from "../main/note_actions";
import {
  getWordsInMatureCards,
  queryNotes,
  type MiniNote,
  type SentencesNoteFields,
} from "common/ankiconnect";
import { Constants } from "common/constants";
import { chooseNextBestNote } from "common/choose_best_note";

async function getNotesToUpdate(
  deckName: string
): Promise<MiniNote<SentencesNoteFields>[]> {
  const notes = await queryNotes<SentencesNoteFields>(
    deckName,
    "-is:suspended"
  );

  const notesWithoutPictures = notes.filter(
    (note) => note.fields["Picture"]?.value === ""
  );

  return notesWithoutPictures;
}

async function updateNote(deckName: string, nid: number, note: DictNote) {
  const readingAudioFilename = await tryDownloadTermAudio(
    note.dictionary.expression,
    note.dictionary.reading
  );

  if (readingAudioFilename == undefined) {
    console.log("No reading audio found");
    return;
  }

  await updateTheNote(nid, note, readingAudioFilename);
}

async function go() {
  const deckName = Constants.SentenceDeckName;

  const notesToUpdate = await getNotesToUpdate(deckName);
  const dataItems = await loadDataItems();
  const words = await getWordsInMatureCards(deckName);

  for (const original of notesToUpdate.slice(0, 10)) {
    const otherSentences = searchSentences(
      original.fields.Word.value,
      dataItems
    ).filter(
      (s) => s.sentence.eng != original.fields["Sentence-English"].value
    );

    const bestOther = await chooseNextBestNote(
      original.fields.Sentence.value,
      otherSentences,
      words
    );

    if (!bestOther) {
      console.log("No other best not found for", original.fields.Sentence);
      continue;
    }

    console.log(
      original.nid,
      original.fields.Sentence.value,
      " ----> ",
      bestOther?.sentence.sentence
    );

    await updateNote(deckName, original.nid, bestOther);
  }
}

// const words = await getWordsInMatureCards("Core2.3k Version 3");
// JSON.stringify(words, null, 2);
// Bun.write("words.json", JSON.stringify(words, null, 2));

await go();
