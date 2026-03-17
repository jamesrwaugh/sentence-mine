import { Unpack } from "anki-apkg-parser";
import { DataPaths } from "common/IDataItems";

async function unpackDeck() {
  const deckPath = DataPaths.ankiDroneSentencePackApkg;
  const UNPACK_PATH = DataPaths.ankidroneDeckFolder;

  try {
    const unpack = new Unpack();
    await unpack.unpack(deckPath, UNPACK_PATH);
  } catch (error) {
    console.error(error);
  }
}
