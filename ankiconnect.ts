import { YankiConnect } from "yanki-connect";
import type { Sentence } from "./search_sentence";
import type { DictionaryEntry } from "./dictionary";

const client = new YankiConnect();

interface Note {
  sentence: Sentence;
  dictionary: DictionaryEntry;
}

function makeGlossary(glossary: DictionaryEntry["glossary"]): string {
  const glossaryMap: Record<string, string[]> = {};

  for (const g of glossary) {
    glossaryMap[g.id] ??= [];
    glossaryMap[g.id]!.push(g.meaning);
  }

  return Object.entries(glossaryMap)
    .map(([id, meanings], index) => `${index + 1}.  ${meanings.join(", ")}`)
    .join("<br>");
}

export async function addNote(deckName: string, modelName: string, note: Note) {
  const nid = await client.note.addNote({
    note: {
      deckName,
      modelName,
      fields: {
        Word: note.sentence.searchTerm,
        Reading: note.dictionary.reading,
        Glossary: makeGlossary(note.dictionary.glossary),
        Sentence: note.sentence.sentence,
        "Sentence-English": note.sentence.eng,
      },
      audio: [
        // Can we get audio just for the word?
        // {
        //   path: note.sentence.randomAudioFilename,
        //   fields: ["Audio"],
        // },
        {
          path: note.sentence.randomAudioFilename,
          fields: ["Sentence-Audio"],
        },
      ],
      // picture: [
      //   {
      //     path: note.sentence.randomAudioFilename,
      //     fields: ["Front"],
      //   },
      // ],
    },
  });

  console.log(nid);
}
