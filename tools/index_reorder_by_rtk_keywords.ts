import {
  queryNotes,
  type MiniNote,
  type SentencesNoteFields,
} from "common/ankiconnect";
import { parseAnkiSoundField } from "common/audio";
import { Constants } from "common/constants";
import { nameof } from "common/nameof";
import { LoadJouyouRtkKeywords } from "common/rtk_keywords";
import { indexBy } from "underscore";
import { YankiConnect } from "yanki-connect";

// Originally used to sort new cards
// according to RTK keywords, instead of random, in order to
// group words using the same kanji together to be
// reviewed on the same day. This follows RTK wisdom
// of grouping similar kanji in learning order.
//
// Examples:
// 日和
// 日差し
// 日光
// 日陰
// 目安
// 目撃

interface CardItems {
  note: MiniNote<SentencesNoteFields>;
  picture?: string;
  audio?: string;
  audioFilename?: string;
}

function parseImgFilename(html?: string) {
  // <img src=\"3527982i.webp\">

  const match = html?.match(/src=\"(.*?)\"/);

  if (!match) {
    return null;
  }

  return match[1] ?? null;
}

async function go(c: YankiConnect, fn: string | null) {
  const b = fn
    ? await c.media.retrieveMediaFile({
        filename: fn,
      })
    : null;
  if (fn != null && b === false) {
    throw new Error("Media error: " + fn);
  }
  if (b === false || b === null || fn === null) {
    return null;
  }
  return {
    base64: b,
    filename: fn,
  };
}

type NoteMedia = {
  data?: string;
  fields?: string[];
  filename: string;
  path?: string;
  skipHash?: string;
  url?: string;
};

// 接: touch, 近: near
function GetRtkKeywords(s?: string): string[] {
  const a = s?.split(",");
  const b = a
    ?.map((x) => x.split(":"))
    .map((x) => x[0]?.trim()!)
    .filter((x) => !!x);
  return b ?? [];
}

async function main() {
  const c = new YankiConnect();

  const keywords = await LoadJouyouRtkKeywords();
  const keywordIndex = indexBy(keywords, (item) => item.kanji);

  const notes = await queryNotes<SentencesNoteFields>(
    Constants.SentenceDeckName,
    "is:new"
  );

  const sortedNotes = notes
    .map((note) => ({
      note: note,
      rtk: GetRtkKeywords(note.fields.WordRtkKeywords.value),
    }))
    .toSorted(({ note: note1, rtk: rtk1 }, { note: note2, rtk: rtk2 }) => {
      if (rtk1.length === 0 || rtk2.length === 0) {
        return note1.fields.Word.value.localeCompare(note2.fields.Word.value);
      }
      const a = keywordIndex[rtk1[0]!]!;
      const b = keywordIndex[rtk2[0]!]!;
      return Number(a.heisigId) - Number(b.heisigId);
    });

  for (const { note, rtk } of sortedNotes) {
    const nid = await duplicateNote(c, note);
    console.log(nid);
  }
}

await main();

async function duplicateNote(
  c: YankiConnect,
  note: MiniNote<SentencesNoteFields>
): Promise<number | null> {
  const audioFn = await go(c, parseAnkiSoundField(note.fields.Audio.value));
  const sentAudioFn = await go(
    c,
    parseAnkiSoundField(note.fields["Sentence-Audio"].value)
  );
  const imgfn = await go(c, parseImgFilename(note.fields.Picture.value));

  type F = SentencesNoteFields;

  let audioArray: NoteMedia[] = [];
  let imageArray: NoteMedia[] = [];

  if (audioFn) {
    audioArray.push({
      filename: audioFn.filename,
      data: audioFn.base64,
      fields: [nameof<F>("Audio")],
    });
  }

  if (sentAudioFn) {
    audioArray.push({
      filename: sentAudioFn.filename,
      data: sentAudioFn.base64,
      fields: [nameof<F>("Sentence-Audio")],
    });
  }

  if (imgfn) {
    imageArray.push({
      filename: imgfn.filename,
      data: imgfn.base64,
      fields: [nameof<F>("Picture")],
    });
  }

  const addParameter: Parameters<typeof c.note.addNote>[0]["note"] = {
    deckName: Constants.SentenceDeckName,
    modelName: Constants.SentenceDeckModelName,
    fields: {
      [nameof<F>("Word")]: note.fields.Word.value,
      [nameof<F>("Reading")]: note.fields.Reading.value,
      [nameof<F>("Glossary")]: note.fields.Glossary.value,
      [nameof<F>("Hint")]: note.fields.Hint.value,
      [nameof<F>("Sentence")]: note.fields.Sentence.value,
      [nameof<F>("Sentence-English")]: note.fields["Sentence-English"].value,
      [nameof<F>("WordRtkKeywords")]: note.fields.WordRtkKeywords.value,
    },
    audio: audioArray,
    picture: imageArray,
    tags: note.tags,
    options: {
      allowDuplicate: true,
    },
  };

  return await c.note.addNote({
    note: addParameter,
  });
}
