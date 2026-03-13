import type { ClozeNoteFields } from "./add_cards";
import { queryNotes } from "../main/ankiconnect";
import { generateAudioToFileWParams } from "./google";
import { readdir } from "node:fs/promises";
import { YankiConnect } from "yanki-connect";

const feminineVoices = [
  "ja-JP-Chirp3-HD-Aoede",
  "ja-JP-Chirp3-HD-Despina",
  "ja-JP-Chirp3-HD-Zephyr",
  "ja-JP-Chirp3-HD-Erinome",
  "ja-JP-Chirp3-HD-Gacrux",
  "ja-JP-Chirp3-HD-Laomedeia",
];

const masculineVoices = [
  "ja-JP-Chirp3-HD-Enceladus",
  "ja-JP-Chirp3-HD-Alnilam",
  "ja-JP-Chirp3-HD-Umbriel",
  "ja-JP-Chirp3-HD-Schedar",
  "ja-JP-Chirp3-HD-Charon",
  "ja-JP-Chirp3-HD-Enceladus",
  "ja-JP-Chirp3-HD-Fenrir",
];

const allVoices = [...masculineVoices, ...feminineVoices];

function getVoiceName(filename: string): string | null {
  // [sound:事件_sentence_この事件は警察が捜査中です。_ja-JP-Chirp3-HD-Laomedeia.mp3.mp3]
  var x = filename.indexOf("ja-JP-");
  var b = filename.indexOf(".", x);
  if (x === -1 || b === -1) {
    return null;
  }
  const voiceText = filename.substring(x, b);
  if (allVoices.includes(voiceText)) {
    return voiceText;
  }
  return null;
}

function getFillerSentence(sentence: string): string {
  return sentence.replace(/{{.*?}}/, "(ナニナニ)");
}

async function generatePreviewAudioToFiles() {
  const groupNotes = await queryNotes<ClozeNoteFields>("Clozes", ``);

  const items = groupNotes
    .map((x) => ({
      nid: x.nid,
      text: getFillerSentence(x.fields.Text.value),
      voiceName: getVoiceName(x.fields["Sentence-Audio"].value)!,
    }))
    .filter((x) => !!x.voiceName);

  const promises = items.map((x) =>
    generateAudioToFileWParams(x.text, x.voiceName, `${x.nid}.mp3`)
  );

  await Promise.all(promises);
}

async function applyToNotes() {
  const client = new YankiConnect();

  const files = await readdir(
    "/home/james/Desktop/Git/sentence-mine/cloze/data/audio-temp"
  );

  console.log(files);

  for (const file of files) {
    const nid = parseInt(file.replace(".mp3", ""));

    if (isNaN(nid)) {
      throw new Error("?");
    }

    await client.note.updateNote({
      note: {
        fields: {},
        audio: [
          {
            filename: `${nid}_sentence_preview.mp3`,
            path: `/home/james/Desktop/Git/sentence-mine/cloze/data/audio-temp/${file}`,
            replace: true,
            fields: ["PreviewAudio"],
          },
        ],
        id: nid,
      },
    });
  }
}

await applyToNotes();
