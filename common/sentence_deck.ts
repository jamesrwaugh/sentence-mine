import type INote from "anki-apkg-parser/src/core/interfaces/INote";

export interface SentenceDeck {
  notes: Record<string, INote>;
  media: Record<string /*term*/, string /*filename*/>;
  noteFields: string[][];
}
