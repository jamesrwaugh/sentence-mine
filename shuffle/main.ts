import { loadDataItems } from "../main/data_items";
import { searchSentences, type DictNote } from "../main/search_sentence";
import { tryDownloadTermAudio } from "../main/audio";
import { updateTheNote } from "../main/note_actions";
import { GetMecabWords } from "../main/mecab";
import { max } from "underscore";
import { queryNotes, type AnkiField, type MiniNote } from "../main/ankiconnect";

export interface NoteFields {
  Word: AnkiField;
  Reading: AnkiField;
  Glossary: AnkiField;
  Sentence: AnkiField;
  "Sentence-English": AnkiField;
  Picture: AnkiField;
  Audio: AnkiField;
  "Sentence-Audio": AnkiField;
  Hint: AnkiField;
  WordRtkKeywords: AnkiField;
}

async function getWordsInMatureCards(deckName: string): Promise<Set<string>> {
  const notes = await queryNotes<NoteFields>(
    deckName,
    "-is:suspended prop:ivl>21"
  );

  const wordsInSentencesPs = notes
    .map((note) => note.fields.Sentence.value)
    .map((sentence) => GetMecabWords(sentence));

  const wordsInSentences = (await Promise.all(wordsInSentencesPs)).flat();

  const uniqueWords = new Set(wordsInSentences);

  return uniqueWords;
}

async function getNotesToUpdate(
  deckName: string
): Promise<MiniNote<NoteFields>[]> {
  const notes = await queryNotes<NoteFields>(deckName, "-is:suspended");

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

  const originalWords = new Set(await GetMecabWords(originalSentence));

  const mecabPromises: Promise<A>[] = options.map(
    (s) =>
      new Promise(async (resolve) => {
        const items = await GetMecabWords(s.sentence.sentence);
        resolve({
          words: new Set(items),
          original: s,
        });
      })
  );

  const dictNoteWordsSets = await Promise.all(mecabPromises);

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
  const deckName = "Core2.3k Version 3";

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
