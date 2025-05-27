import { addNote } from "./ankiconnect";
import { tryDownloadJpod101Audio } from "./audio";
import { loadDictionary } from "./dictionary";
import { searchSentences } from "./search_sentence";

const dictionary = await loadDictionary();

const sentences = await searchSentences("比較", dictionary);

sentences.forEach((sentence, index) => {
  console.log(
    `${index}: ${sentence.sentence.sentence} -- ${sentence.sentence.eng}`
  );
});

console.log("Pick which to add:");
// const choice = await Bun.stdin.text();
const index = parseInt("6");
const note = sentences[index];

if (note == undefined) {
  console.log("No note found");
  process.exit(1);
}

const readingAudioFilename = await tryDownloadJpod101Audio(
  note.dictionary.expression,
  note.dictionary.reading
);

if (readingAudioFilename == undefined) {
  console.log("No reading audio found");
  process.exit(1);
}

try {
  const nid = await addNote("Sentence Mine", "core2.3k-anime-card", {
    ...note,
    readingAudioFilename,
  });
  console.log("AnkiConnect:", nid);
} catch (e) {
  console.log("AnkiConnect:", (e as Error)?.message ?? e);
}
