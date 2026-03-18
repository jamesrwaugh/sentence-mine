import { YankiConnect } from "yanki-connect";
import { GetSudachiWords } from "common/sudachi";
import { Constants } from "common/constants";

export interface Welcome {
  noteId: number;
  profile: string;
  tags: any[];
  fields: Fields;
  modelName: string;
  mod: number;
  cards: number[];
}

export interface Fields {
  Word: Audio;
  Reading: Audio;
  Glossary: Audio;
  Sentence: Audio;
  "Sentence-English": Audio;
  Picture: Audio;
  Audio: Audio;
  "Sentence-Audio": Audio;
  Hint: Audio;
}

export interface Audio {
  value: string;
  order: number;
}

const client = new YankiConnect();

async function DumpNotes() {
  const notes = await client.note.findNotes({
    query: `deck:"${Constants.SentenceDeckName}"`,
  });
  console.log("Found", notes.length);
  const fields = await client.note.notesInfo({ notes: notes });
  console.log("Found Fields", fields.length);
  Bun.write("out_notes.json", JSON.stringify(fields));
}

async function BeCool() {
  const items: Welcome[] = await Bun.file("out_notes.json").json();

  const wordsInWords = new Set<string>(items.map((i) => i.fields.Word.value));

  const wordsInSentencesPs = items
    .map((s) => s.fields.Sentence.value)
    .map((s) => GetSudachiWords(s));

  const wordsInSentences = (await Promise.all(wordsInSentencesPs)).flat();

  const wordsInSentencesSet = new Set(wordsInSentences);

  const diff = wordsInSentencesSet.difference(wordsInWords);

  Bun.write("spurious_words.json", JSON.stringify([...diff]));
}

async function GetSpuriousWords() {
  await DumpNotes();
  await BeCool();
}

await GetSpuriousWords();
