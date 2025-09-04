import {
  addNote,
  addImage,
  searchFirstNoteId,
  updateNote,
} from "./ankiconnect";
import { tryDownloadTermAudio } from "./audio";
import type { DictformIndex } from "./dictform_index";
import type { Dictionary } from "./dictionary";
import { type CsvItem, input } from "./io";
import {
  type DictNote,
  type SentenceDeck,
  searchSentences,
} from "./search_sentence";

type AddResult =
  | {
      nid: number;
      sentence: string;
    }
  | {
      error: "duplicate" | "no-sentence" | "no-audio" | "no-nid";
    };

async function addTheNote(
  note: DictNote,
  audioFilename: string
): Promise<AddResult> {
  try {
    const nid = await addNote("Core2.3k Version 3", "core2.3k-anime-card", {
      note,
      audioFilename,
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

async function updateTheNote(
  existingNid: number,
  note: DictNote,
  audioFilename: string
): Promise<AddResult> {
  try {
    await updateNote(existingNid, {
      note,
      audioFilename,
    });
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
    nid: existingNid,
    sentence: note.sentence.sentence,
  };
}

export async function processAddNewOrUpdateNote(
  deckName: string,
  row: CsvItem,
  deck: SentenceDeck,
  dictionary: Dictionary,
  dictformIndex: DictformIndex
): Promise<AddResult> {
  const { 漢字 } = row;

  const sentences = await searchSentences(
    漢字,
    deck,
    dictionary,
    dictformIndex
  );

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

  const readingAudioFilename = await tryDownloadTermAudio(
    note.dictionary.expression,
    note.dictionary.reading
  );

  if (readingAudioFilename == undefined) {
    console.log("No reading audio found");
    return {
      error: "no-audio",
    };
  }

  const existingNid = await searchFirstNoteId(
    deckName,
    note.sentence.searchTerm
  );

  if (existingNid == undefined) {
    return await addTheNote(note, readingAudioFilename);
  } else {
    console.log("Updating existing note", existingNid);
    return await updateTheNote(existingNid, note, readingAudioFilename);
  }
}

export async function processAddImage(row: CsvItem): Promise<boolean> {
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

export function getNoteId(row: CsvItem): number {
  return parseInt(row.ノートID);
}
