import { YankiConnect } from "yanki-connect";
import type { Sentence } from "./search_sentence";
import type { DictionaryEntry } from "./dictionary";

const client = new YankiConnect();

interface Note {
  sentence: Sentence;
  dictionary: DictionaryEntry;
}

export async function addNote(deckName: string, modelName: string, note: Note) {
  const nid = await client.note.addNote({
    note: {
      deckName,
      modelName,
      fields: {
        Sentence: note.sentence.sentence,
        "Sentence-English": note.sentence.eng,
        Word: note.sentence.searchTerm,
        Glossary: note.dictionary.glossary.map((g) => g.meaning).join("\n"),
        Reading: note.dictionary.reading,
      },
      audio: [
        {
          path: note.sentence.randomAudioFilename,
          fields: ["Audio"],
        },
        {
          path: note.sentence.randomAudioFilename,
          fields: ["Sentence-Audio"],
        },
      ],
      picture: [
        {
          path: note.sentence.randomAudioFilename,
          fields: ["Front"],
        },
      ],
    },
  });

  console.log(nid);
}
