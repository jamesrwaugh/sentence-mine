import { addImage, addNote } from "./ankiconnect";
import { tryDownloadJpod101Audio } from "./audio";
import { loadDictionary, type Dictionary } from "./dictionary";
import { input, loadCsv, saveCsv, type CsvItem } from "./io";
import {
  loadSentenceDeck,
  searchSentences,
  type SentenceDeck,
} from "./search_sentence";

interface AddResult {
  nid: number;
  sentence: string;
}

async function processAddNewNote(
  row: CsvItem,
  deck: SentenceDeck,
  dictionary: Dictionary
): Promise<AddResult | null> {
  const { 漢字, 絵 } = row;
  const sentences = await searchSentences(漢字, deck, dictionary);

  if (sentences.length === 0) {
    console.log(`No sentences found for ${漢字}. Is it dictionary form?`);
    return null;
  }

  sentences.forEach((sentence, index) => {
    console.log(
      `${index}: ${sentence.sentence.sentence} -- ${sentence.sentence.eng}`
    );
  });

  const index = await input("Pick which to add: ");
  const note = sentences[index];

  if (note == undefined) {
    return null;
  }

  const readingAudioFilename = await tryDownloadJpod101Audio(
    note.dictionary.expression,
    note.dictionary.reading
  );

  if (readingAudioFilename == undefined) {
    console.log("No reading audio found");
    return null;
  }

  try {
    const nid = await addNote("Sentence Mine", "core2.3k-anime-card", {
      ...note,
      readingAudioFilename,
    });
    if (nid == null) {
      console.log("AnkiConnect: No nid");
      return null;
    }
    console.log("AnkiConnect:", nid);
    return {
      nid,
      sentence: note.sentence.sentence,
    };
  } catch (e) {
    console.log("AnkiConnect:", (e as Error)?.message ?? e);
  }

  return null;
}

async function processAddImage(row: CsvItem): Promise<boolean> {
  try {
    const nid = parseInt(row.ノートID);
    if (isNaN(nid)) {
      console.log("No nid");
      return false;
    }
    await addImage(nid, row.漢字, row.絵);
    return true;
  } catch (e) {
    console.log("AnkiConnect addImage:", (e as Error)?.message ?? e);
    return false;
  }
}

async function main() {
  console.log("Loading dictionary...");
  const dictionary = await loadDictionary();

  console.log("Loading deck...");
  const deck = await loadSentenceDeck();

  const items = await loadCsv();

  const unadded = items
    .filter((r) => r.Error === "")
    .filter((r) => r.ノートID === "");

  for (const row of unadded) {
    console.log(`New: ${row.漢字} ....`);
    const result = await processAddNewNote(row, deck, dictionary);
    if (result != null) {
      row.ノートID = result.nid.toString();
      row.例文 = result.sentence;
    } else {
      console.log("No result");
    }
  }

  const addedWithImageUpdates = items
    .filter((r) => r.Error === "")
    .filter((r) => r.ノートID !== "" && r.絵 !== "" && r.NoteImage !== r.絵);

  for (const row of addedWithImageUpdates) {
    console.log(`New Image: ${row.漢字} ....`);
    const result = await processAddImage(row);
    if (result) {
      row.NoteImage = row.絵;
    }
  }

  await saveCsv(items);

  console.log("Done");
}

await main();
