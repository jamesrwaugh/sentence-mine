import {
  addNote,
  queryNotes,
  type AnkiField,
  type MiniNote,
  type SentencesNoteFields,
} from "common/ankiconnect";
import { Constants } from "common/constants";
import { loadDataItems } from "common/data_items";
import { GetMecabWords } from "common/mecab";
import { searchSentences, type DictNote } from "common/search_sentence";
import { analyze, type SudachiLine } from "common/sudachi";
import { chunk, max, uniq } from "underscore";

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
    word: x.fields.VocabKanji.value
      .replaceAll(/\[.*?\]/g, "")
      .replaceAll(/<[^>]*>?/gi, ""),
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

async function loadNotes() {
  const existingWords = await getAllExistingWordsSet();
  const existingWordsSet = new Set(existingWords.map((s) => s.word));

  const notes: MiniNote<N2Fields>[] = JSON.parse(
    await Bun.file("words_every.json").text()
  );

  const dataItems = await loadDataItems();

  for (const note of notes.slice(0, 10)) {
    const sentences = searchSentences(note.fields.VocabKanji.value, dataItems);

    const best = await chooseNextBestNote(
      note.fields.SentKanji.value.replaceAll(/<[^>]*>?/gi, ""),
      sentences,
      existingWordsSet
    );

    if (!best) {
      continue;
    }

    const nid = await addNote(
      Constants.SentenceDeckName,
      Constants.SentenceDeckModelName,
      { note: best, audioFilename: best.sentence.randomAudioFilename },
      dataItems.rtkKeywords
    );

    console.log(
      note.fields.VocabKanji,
      "-->",
      best?.sentence.sentence,
      " ---> ",
      nid
    );
  }
}

async function test() {
  // a
  const b = await analyze("やる");
  console.log(b);
}

await loadNotes();
