// Imports the Google Cloud client library
import { protos, TextToSpeechClient } from "@google-cloud/text-to-speech";

// Creates a client
const client = new TextToSpeechClient();

async function quickStart(text: string) {
  const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest =
    {
      input: { text: text },
      // Select the language and SSML voice gender (optional)
      voice: {
        languageCode: "ja-JP",
        name: "ja-JP-Chirp3-HD-Aoede",
      },
      // select the type of audio encoding
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

  return response.audioContent;
}

await quickStart("こんにちは、世界！");
