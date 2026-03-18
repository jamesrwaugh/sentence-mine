import { loadDataItems } from "common/data_items";
import { searchSentences, type DictNote } from "common/search_sentence";
import { tryDownloadTermAudio } from "common/term_audio";
import { updateTheNote } from "../main/note_actions";
import { GetSudachiWords } from "common/sudachi";
import { max } from "underscore";
import {
  getWordsInMatureCards,
  queryNotes,
  type MiniNote,
  type SentencesNoteFields,
} from "common/ankiconnect";
import { Constants } from "common/constants";

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

interface A {
  words: Set<string>;
  original: DictNote;
}

async function chooseNextBestNote(
  originalSentence: string,
  options: DictNote[],
  matureWordSet: Set<string>
): Promise<DictNote | null> {
  if (options.length == 0) {
    return null;
  }

  const originalWords = new Set(await GetSudachiWords(originalSentence));

  const sudachiPromises: Promise<A>[] = options.map(
    (s) =>
      new Promise(async (resolve) => {
        const items = await GetSudachiWords(s.sentence.sentence);
        resolve({
          words: new Set(items),
          original: s,
        });
      })
  );

  const dictNoteWordsSets = await Promise.all(sudachiPromises);

  const scored = dictNoteWordsSets
    .filter((s) => s.words.size > 0)
    .map(({ words, original }) => {
      const intersection = words.intersection(matureWordSet);
      const intersectionPct = intersection.size / words.size;
      const diffPenalty =
        Math.abs(words.size - originalWords.size) / originalWords.size;
      return {
        original: original,
        score: intersectionPct - diffPenalty,
      };
    });

  const bestScore = max(scored, (a) => a.score);

  if (typeof bestScore == "number") {
    return null;
  }

  return bestScore.original;
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
