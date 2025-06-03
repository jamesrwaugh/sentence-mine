import { addImage, addNote } from "./ankiconnect";
import { tryDownloadJpod101Audio } from "./audio";
import { loadDictionary, type Dictionary } from "./dictionary";
import { input, loadCsv, saveCsv, type CsvItem } from "./io";
import {
  loadSentenceDeck,
  searchSentences,
  type SentenceDeck,
} from "./search_sentence";

type AddResult =
  | {
      nid: number;
      sentence: string;
    }
  | {
      error: "duplicate" | "no-sentence" | "no-audio" | "no-nid";
    };

async function processAddNewNote(
  row: CsvItem,
  deck: SentenceDeck,
  dictionary: Dictionary
): Promise<AddResult> {
  const { 漢字 } = row;
  const sentences = await searchSentences(漢字, deck, dictionary);

  if (sentences.length === 0) {
    console.log(`No sentences found for ${漢字}. Is it dictionary form?`);
    return {
      error: "no-sentence",
    };
  }

  sentences.forEach((sentence, index) => {
    console.log(
      `${index}: ${sentence.sentence.sentence} -- ${sentence.sentence.eng}`
    );
  });

  const index = await input("Pick which to add: ");
  const note = sentences[index];

  if (note == undefined) {
    return {
      error: "no-sentence",
    };
  }

  const readingAudioFilename = await tryDownloadJpod101Audio(
    note.dictionary.expression,
    note.dictionary.reading
  );

  if (readingAudioFilename == undefined) {
    console.log("No reading audio found");
    return {
      error: "no-audio",
    };
  }

  try {
    const nid = await addNote("Core2.3k Version 3", "core2.3k-anime-card", {
      ...note,
      readingAudioFilename,
    });
    if (nid == null) {
      console.log("AnkiConnect: No nid");
      return {
        error: "no-nid",
      };
    }
    console.log("AnkiConnect:", nid);
    return {
      nid,
      sentence: note.sentence.sentence,
    };
  } catch (e) {
    const message = (e as Error)?.message ?? "";
    console.log("AnkiConnect:", message);
    if (message.toLowerCase().includes("duplicate")) {
      return {
        error: "duplicate",
      };
    }
  }

  return {
    error: "no-nid",
  };
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
    if ("nid" in result) {
      row.ノートID = result.nid.toString();
      row.例文 = result.sentence;
      row.Error = "";
    } else {
      console.log("No result", result);
      row.Error = result.error;
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
