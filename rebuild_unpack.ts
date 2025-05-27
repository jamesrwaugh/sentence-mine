import { Unpack } from "anki-apkg-parser";

const deckPath = "./Ankidrone Sentence Pack V4.apkg.zip";
export const UNPACK_PATH = "./deck-folder";

async function unpackDeck() {
  try {
    const unpack = new Unpack();
    await unpack.unpack(deckPath, UNPACK_PATH);
  } catch (error) {
    console.error(error);
  }
}

await unpackDeck();
