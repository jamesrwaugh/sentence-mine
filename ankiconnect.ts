import { YankiConnect } from "yanki-connect";
import { Sentence } from "./search_sentence";

const client = new YankiConnect();

const decks = await client.deck.deckNames();

console.log(decks); // ["Your", "Deck", "Names", "Here"]

async function addNote(note: Sentence) {
  const nid = await client.note.addNote({
    note: {
      deckName: "Your Deck Name",
      modelName: "Basic",
      fields: {
        Sentence: note.sentence,
        "Sentence-English": note.eng,
        Word: note.searchTerm,
        Glossary: "TODO",
        Reading: note.furigana,
      },
      audio: [
        {
          path: note.randomAudioFilename,
          fields: ["Audio"],
        },
        {
          path: note.randomAudioFilename,
          fields: ["Sentence-Audio"],
        },
      ],
      picture: [
        {
          path: "/home/james/Downloads/Ankidrone/NDL_0001_Male.ogg",
          fields: ["Front"],
        },
      ],
    },
  });

  console.log(nid);
}
