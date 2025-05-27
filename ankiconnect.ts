import { YankiConnect } from "yanki-connect";
import type { Sentence } from "./search_sentence";
import type { DictionaryEntry } from "./dictionary";

const client = new YankiConnect();

interface Note {
  sentence: Sentence;
  dictionary: DictionaryEntry;
  readingAudioFilename: string | undefined;
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
  const item: Parameters<typeof client.note.addNote>[0]["note"] = {
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
      {
        filename: `${note.sentence.searchTerm}_sentence_${note.sentence.randomAudioFilename}.mp3`,
        path: `/home/james/Desktop/Git/sentence-mine/deck-folder/${note.sentence.randomAudioFilename}`,
        fields: ["Sentence-Audio"],
      } as any,
    ],
  };

  if (note.readingAudioFilename) {
    item.audio!.push({
      filename: `${note.sentence.searchTerm}_reading.mp3`,
      path: `/home/james/Desktop/Git/sentence-mine/${note.readingAudioFilename}`,
      fields: ["Audio"],
    } as any);
  }

  const nid = await client.note.addNote({
    note: item,
  });

  return nid;
}
