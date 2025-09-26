import { YankiConnect } from "yanki-connect";
import { tokenize, tokenizeSync } from "@enjoyjs/node-mecab";

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
    query: 'deck:"Core2.3k Version 3"',
  });
  console.log("Found", notes.length);
  const fields = await client.note.notesInfo({ notes: notes });
  console.log("Found Fields", fields.length);
  Bun.write("out_notes.json", JSON.stringify(fields));
}

async function GetWords(text: string) {
  const tokens = await tokenize(text);

  const badPos = ["助詞", "記号", "BOS/EOS"];

  const items = tokens
    .filter((t) => t.feature.pos && !badPos.includes(t.feature.pos))
    .map((t) => t.feature.basicForm || t.surface);

  return items;
}

async function BeCool() {
  const items: Welcome[] = await Bun.file("out_notes.json").json();

  const wordsInWords = new Set<string>(items.map((i) => i.fields.Word.value));

  const wordsInSentencesPs = items
    .map((s) => s.fields.Sentence.value)
    .map((s) => GetWords(s));

  const wordsInSentences = (await Promise.all(wordsInSentencesPs)).flat();

  const wordsInSentencesSet = new Set(wordsInSentences);

  const diff = wordsInSentencesSet.difference(wordsInWords);

  Bun.write("spurious_words.json", JSON.stringify([...diff]));
}
