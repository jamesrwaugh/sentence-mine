import { protos, TextToSpeechClient } from "@google-cloud/text-to-speech";
import { join } from "node:path";
import { DataPaths } from "../main/IDataItems";

const masculineJapaneseWords = ["俺", "僕", "だろう"];

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

function getVoice(sentence: string) {
  if (masculineJapaneseWords.includes(sentence)) {
    return masculineVoices[Math.floor(Math.random() * masculineVoices.length)];
  } else if (Math.random() < 0.5) {
    return feminineVoices[Math.floor(Math.random() * feminineVoices.length)];
  } else {
    return masculineVoices[Math.floor(Math.random() * masculineVoices.length)];
  }
}

export async function generateAudioToFile(text: string): Promise<string> {
  const client = new TextToSpeechClient();

  const voice = getVoice(text);

  const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest =
    {
      input: { text: text },
      voice: {
        languageCode: "ja-JP",
        name: voice,
      },
      audioConfig: {
        audioEncoding: "LINEAR16",
        speakingRate: 1,
        pitch: 0,
        volumeGainDb: 0,
        sampleRateHertz: 44100,
      },
    };

  const [response] = await client.synthesizeSpeech(request);

  if (!response.audioContent) {
    throw new Error("No audio content in response");
  }

  const filename = `${text}_${voice}.mp3`;

  await Bun.write(
    join(DataPaths.audioTempFolder, filename),
    response.audioContent
  );

  return filename;
}
