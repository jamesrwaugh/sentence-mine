import {
  addNote,
  queryNotes,
  type AnkiField,
  type MiniNote,
  type SentencesNoteFields,
} from "common/ankiconnect";
import { Constants } from "common/constants";
import { loadDataItems } from "common/data_items";
import { searchSentences } from "common/search_sentence";
import { analyze, type SudachiLine } from "common/sudachi";
import { tryDownloadTermAudio } from "common/term_audio";
import { chunk, uniq } from "underscore";
import { chooseNextBestNote } from "common/choose_best_note";
import { removeHtmlTags } from "common/string_utils";
import type { IDataItems } from "common/IDataItems";

interface N2Fields {
  SentKanji: AnkiField;
  SentFurigana: AnkiField;
  SentEng: AnkiField;
  SentAudio: AnkiField;
  VocabKanji: AnkiField;
  VocabFurigana: AnkiField;
  VocabPitchPattern: AnkiField;
  VocabPitchNum: AnkiField;
  VocabDef: AnkiField;
  VocabAudio: AnkiField;
  Image: AnkiField;
  Notes: AnkiField;
  MakeProductionCard: AnkiField;
  Focus: AnkiField;
}

interface WordAndNid {
  nid: number;
  word: string;
}

function removeNumbering(s: string) {
  return s.replaceAll(/\[.*?\]/g, "");
}

function cleanRawN2DeckKanji(s: string) {
  return removeNumbering(removeHtmlTags(s));
}

async function getAllExistingWordsSet(): Promise<Array<WordAndNid>> {
  const notes = await queryNotes<SentencesNoteFields>(
    Constants.SentenceDeckName,
    ""
  );

  const b: WordAndNid[] = notes.map((x) => ({
    nid: x.nid,
    word: x.fields.Word.value,
  }));

  return uniq(b, (aa) => aa.word);
}

async function getAllN2WordsSet(): Promise<{
  words: Array<WordAndNid>;
  notes: MiniNote<N2Fields>[];
}> {
  const notes = await queryNotes<N2Fields>(
    "Ankidrone Essentials V8::4. JLPT Tango N2",
    ""
  );

  const b: WordAndNid[] = notes.map((x) => ({
    nid: x.nid,
    word: cleanRawN2DeckKanji(x.fields.VocabKanji.value),
  }));

  return {
    words: uniq(b, (aa) => aa.word),
    notes: notes,
  };
}

interface AnalysisAndNid {
  nid: number;
  analysis: SudachiLine[];
}

async function getSudachiAnalysis(
  set: WordAndNid[]
): Promise<Array<AnalysisAndNid>> {
  let results: Array<AnalysisAndNid> = [];

  const chunks = chunk(Array.from(set), 100);

  for (const chunk of chunks) {
    const analyzePromises = Array.from(chunk).map(
      (sentence) =>
        new Promise<AnalysisAndNid>(async (resolve) => {
          const a = await analyze(sentence.word);
          resolve({
            nid: sentence.nid,
            analysis: a,
          });
        })
    );

    const chunkResults = (await Promise.all(analyzePromises)).flat();

    results = [...results, ...chunkResults];
  }

  return results;
}

async function getNeededNotesList() {
  const allWords = await getAllExistingWordsSet();
  const { words: n2Words, notes: n2Notes } = await getAllN2WordsSet();

  const allSud = await getSudachiAnalysis(allWords);
  const allN2Sud = await getSudachiAnalysis(n2Words);

  const allExistingNormalizedSet = new Set(
    allSud
      .flatMap((x) => x.analysis.map((y) => y.normalized))
      .filter((y) => !!y)
  );

  const allMissingNormal = allN2Sud.filter(
    (n2) =>
      !n2.analysis.every((ana) => allExistingNormalizedSet.has(ana.normalized))
  );

  console.log("All", n2Words.length);
  console.log("New Normalized", allMissingNormal.length);

  const allMissingNormalNids = new Set(allMissingNormal.map((x) => x.nid));

  const b = n2Notes.filter((x) => allMissingNormalNids.has(x.nid));

  JSON.stringify(b, null, 2);
  Bun.write("words_every.json", JSON.stringify(b, null, 2));

  console.log("OK");
}

interface AddError {
  previousNid: number;
  kanji: string;
  error: string;
}

async function addOne(
  note: MiniNote<N2Fields>,
  dataItems: IDataItems,
  errors: Array<AddError>,
  existingWordsSet: Set<string>
) {
  const sentences = searchSentences(
    cleanRawN2DeckKanji(note.fields.VocabKanji.value),
    dataItems
  );

  if (sentences.length === 0) {
    errors.push({
      previousNid: note.nid,
      kanji: note.fields.VocabKanji.value,
      error: "No sentences",
    });
    Bun.write("errors.json", JSON.stringify(errors));
    return;
  }

  const best = await chooseNextBestNote(
    cleanRawN2DeckKanji(note.fields.SentKanji.value),
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
    return;
  }

  const termAudioFilename = await tryDownloadTermAudio(
    cleanRawN2DeckKanji(note.fields.VocabKanji.value),
    note.fields.VocabFurigana.value
  );

  if (!termAudioFilename) {
    errors.push({
      previousNid: note.nid,
      kanji: note.fields.VocabKanji.value,
      error: "No term audio",
    });
    Bun.write("errors.json", JSON.stringify(errors));
    return;
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
}

async function loadNotes() {
  const existingWords = await getAllExistingWordsSet();
  const existingWordsSet = new Set(existingWords.map((s) => s.word));

  const allN2Notes: MiniNote<N2Fields>[] = JSON.parse(
    await Bun.file("words_every.json").text()
  );

  const dataItems = await loadDataItems();

  const errors: Array<AddError> = JSON.parse(
    await Bun.file("errors.json").text()
  );

  const existingNotes = new Set(
    (
      await queryNotes<SentencesNoteFields>(
        Constants.SentenceDeckName,
        "tag:n2"
      )
    ).map((s) => s.fields.Word.value)
  );

  const notesToAdd = allN2Notes.filter(
    (n) => !existingNotes.has(cleanRawN2DeckKanji(n.fields.VocabKanji.value))
  );

  console.log(
    notesToAdd.length,
    "more notes to add",
    existingNotes.size,
    "existing notes"
  );

  for (const note of notesToAdd) {
    try {
      await addOne(note, dataItems, errors, existingWordsSet);
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

async function test() {
  // a
  const b = await analyze("やる");
  console.log(b);
}

await loadNotes();
