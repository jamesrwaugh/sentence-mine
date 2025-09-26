import { Unpack } from "anki-apkg-parser";
import { DataPaths } from "../main/IDataItems";

async function unpackDeck() {
  const deckPath = DataPaths.ankiDroneSentencePackApkg;
  const UNPACK_PATH = DataPaths.deckFolder;

  try {
    const unpack = new Unpack();
    await unpack.unpack(deckPath, UNPACK_PATH);
  } catch (error) {
    console.error(error);
  }
}
