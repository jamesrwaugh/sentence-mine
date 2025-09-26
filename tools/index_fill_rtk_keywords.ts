import { YankiConnect } from "yanki-connect";
import { FindRtkKeywords, type RtkKeywordLine } from "../main/rtk_keywords";

async function FillRtkKeywords(rtkKeywordsAll: RtkKeywordLine[]) {
  const yankiConnect = new YankiConnect();

  const noteIds = await yankiConnect.note.findNotes({
    query: 'deck:"Core2.3k Version 3"',
  });

  const notesInfo = await yankiConnect.note.notesInfo({ notes: noteIds });

  for (const note of notesInfo) {
    const rtkKeywordsFound = FindRtkKeywords(
      note.fields["Word"]?.value,
      rtkKeywordsAll
    );

    if (rtkKeywordsFound.length > 0) {
      console.log(note.noteId, rtkKeywordsFound, "...");

      await yankiConnect.note.updateNote({
        note: {
          id: note.noteId,
          fields: {
            WordRtkKeywords: rtkKeywordsFound.join(", "),
          },
        },
      });
    }
  }
}
