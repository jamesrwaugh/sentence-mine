import * as Bun from "bun";
import { type MiniNote, addNote } from "common/ankiconnect";
import { chooseNextBestNote } from "common/choose_best_note";
import { Constants } from "common/constants";
import { loadDataItems } from "common/data_items";
import { searchSentences } from "common/search_sentence";
import { removeHtmlTags } from "common/string_utils";
import { tryDownloadTermAudio } from "common/term_audio";
import { getAllExistingWordsSet, N2Fields } from "./transfer_n2_words";

export async function loadNotes() {
  const existingWords = await getAllExistingWordsSet();
  const existingWordsSet = new Set(existingWords.map((s) => s.word));

  const notes: MiniNote<N2Fields>[] = JSON.parse(
    await Bun.file("words_every.json").text()
  );

  const dataItems = await loadDataItems();

  const errors: Array<{ previousNid: number; kanji: string; error: string }> =
    JSON.parse(await Bun.file("errors.json").text());

  for (const note of notes) {
    try {
      const sentences = searchSentences(
        note.fields.VocabKanji.value,
        dataItems
      );

      if (sentences.length === 0) {
        errors.push({
          previousNid: note.nid,
          kanji: note.fields.VocabKanji.value,
          error: "No sentences",
        });
        Bun.write("errors.json", JSON.stringify(errors));
        continue;
      }

      const best = await chooseNextBestNote(
        removeHtmlTags(note.fields.SentKanji.value),
        sentences,
        existingWordsSet
      );

      if (!best) {
        errors.push({
          previousNid: note.nid,
          kanji: note.fields.VocabKanji.value,
          error: "No best sentence",
        });
        Bun.write("errors.json", JSON.stringify(errors));
        continue;
      }

      const termAudioFilename = await tryDownloadTermAudio(
        note.fields.VocabKanji.value,
        note.fields.VocabFurigana.value
      );

      if (!termAudioFilename) {
        errors.push({
          previousNid: note.nid,
          kanji: note.fields.VocabKanji.value,
          error: "No term audio",
        });
        Bun.write("errors.json", JSON.stringify(errors));
        continue;
      }

      const nid = await addNote(
        Constants.SentenceDeckName,
        Constants.SentenceDeckModelName,
        { note: best, termAudioFilename: termAudioFilename },
        dataItems.rtkKeywords,
        ["n2"]
      );

      console.log(
        note.fields.VocabKanji.value,
        "-->",
        best?.sentence.sentence,
        " ---> ",
        nid
      );
    } catch (ex) {
      errors.push({
        previousNid: note.nid,
        kanji: note.fields.VocabKanji.value,
        error: `Exception: ${ex}`,
      });
      Bun.write("errors.json", JSON.stringify(errors));
    }
  }
}
