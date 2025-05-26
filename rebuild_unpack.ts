import { Unpack } from "anki-apkg-parser";

const deckPath =
  "/home/james/Downloads/Ankidrone/Ankidrone Sentence Pack V4.apkg.zip";

export const UNPACK_PATH = "./deck-folder";

async function unpackDeck() {
  try {
    const unpack = new Unpack();
    // pass the deck path and the output path for unpacking the deck
    await unpack.unpack(deckPath, UNPACK_PATH);
  } catch (error) {
    console.error(error);
  }
}
