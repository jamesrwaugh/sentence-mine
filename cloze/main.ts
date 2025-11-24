import { YankiConnect } from "yanki-connect";
import { queryNotes, type AnkiField } from "../main/ankiconnect";

const client = new YankiConnect();

export interface NoteFields {
  Text: AnkiField;
  RtkKeywords: AnkiField;
  "Sentence-Audio": AnkiField;
  Picture: AnkiField;
  PictureFront: AnkiField;
  ClozeAudio: AnkiField;
  ClozeAnswer: AnkiField;
  ClozeReading: AnkiField;
}

async function go() {
  const deckName = "Clozes";
  const notes = await queryNotes<NoteFields>(deckName, "");
  console.log(notes);
}

await go();
