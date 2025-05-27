import { addNote } from "./ankiconnect";
import { tryDownloadJpod101Audio } from "./audio";
import { loadDictionary, type Dictionary } from "./dictionary";
import { input, loadCsv, saveCsv } from "./io";
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
  term: string,
  deck: SentenceDeck,
  dictionary: Dictionary
): Promise<AddResult | null> {
  const sentences = await searchSentences(term, deck, dictionary);

  if (sentences.length === 0) {
    console.log(`No sentences found for ${term}. Is it dictionary form?`);
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

async function main() {
  console.log("Loading dictionary...");
  const dictionary = await loadDictionary();

  console.log("Loading deck...");
  const deck = await loadSentenceDeck();

  const items = await loadCsv();

  for (const row of items.filter((r) => r.ノートID === "").slice(0, 3)) {
    console.log(`${row.漢字} ....`);
    const result = await processAddNewNote(row.漢字, deck, dictionary);
    if (result != null) {
      row.ノートID = result.nid.toString();
      row.例文 = result.sentence;
    }
  }

  await saveCsv(items);

  console.log("Done");
}

await main();
