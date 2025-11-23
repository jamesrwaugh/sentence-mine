import {
  addNote,
  addImage,
  searchFirstNoteId,
  updateNote,
} from "./ankiconnect";
import { tryDownloadTermAudio } from "./audio";
import type { IDataItems } from "./IDataItems";
import { type InCsvItem, input } from "./io";
import type { RtkKeywordLine } from "./rtk_keywords";
import { type DictNote, searchSentences } from "./search_sentence";

type AddResult =
  | {
      nid: number;
      sentence: string;
    }
  | {
      error:
        | "duplicate"
        | "no-sentence"
        | "no-audio"
        | "no-nid"
        | "user-skipped";
    };

async function addTheNote(
  note: DictNote,
  audioFilename: string,
  rtkKeywords: RtkKeywordLine[]
): Promise<AddResult> {
  try {
    const nid = await addNote(
      "Core2.3k Version 3",
      "core2.3k-anime-card",
      { note, audioFilename },
      rtkKeywords
    );

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

export async function updateTheNote(
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
  row: InCsvItem,
  dataItems: IDataItems
): Promise<AddResult> {
  const { 漢字 } = row;

  const sentences = searchSentences(漢字, dataItems);

  if (sentences.length === 0) {
    console.log(`No sentences found for ${漢字}`);
    return {
      error: "no-sentence",
    };
  }

  sentences.forEach((sentence, index) => {
    console.log(
      `${index}: ${sentence.sentence.sentence} -- ${sentence.sentence.eng}`
    );
  });

  const indexOrNo = await input("Pick which to add ('n' to skip): ");

  if (indexOrNo == null) {
    return {
      error: "user-skipped",
    };
  }

  const note = sentences[indexOrNo];

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
    return await addTheNote(note, readingAudioFilename, dataItems.rtkKeywords);
  } else {
    console.log("Updating existing note", existingNid);
    return await updateTheNote(existingNid, note, readingAudioFilename);
  }
}

export async function processAddImage(row: InCsvItem): Promise<boolean> {
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

export function getNoteId(row: InCsvItem): number {
  return parseInt(row.ノートID);
}
