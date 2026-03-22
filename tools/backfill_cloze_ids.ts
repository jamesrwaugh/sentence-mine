import { type ClozeNoteFields } from "cloze/add_cards";
import type { InCsvItem } from "cloze/main";
import { queryNotes, updateNote } from "common/ankiconnect";
import { Constants } from "common/constants";
import { loadCsv, saveCsv } from "common/csv_io";
import { DataPaths } from "common/IDataItems";
import { nameof } from "common/nameof";
import { groupBy } from "underscore";
import { YankiConnect } from "yanki-connect";

async function backfillCsvNidLists() {
  const allItems = await loadCsv<InCsvItem>(DataPaths.inputClozeCsv);

  const grouped = groupBy(allItems, (item) => item.グループ番号);

  for (const [id, items] of Object.entries(grouped)) {
    for (const item of items) {
      const notes = await queryNotes<ClozeNoteFields>(
        Constants.ClozeDeckName,
        `GroupId:${id} ClozeAnswer:${item.漢字}`
      );

      console.log(id, item);

      const csvItem = allItems.find(
        (x) => x.グループ番号 === id && x.漢字 === item.漢字
      );

      if (!csvItem) {
        throw Error("???");
      }

      csvItem.ノートID集合 = JSON.stringify(notes.map((x) => x.nid));
    }
  }

  await saveCsv(allItems, DataPaths.inputClozeCsv);
}

async function backfillAnkiIds() {
  const client = new YankiConnect();

  const allItems = await loadCsv<InCsvItem>(DataPaths.inputClozeCsv);

  for (const item of allItems) {
    if (item.ノートID集合 === "") {
      continue;
    }
    const nids: number[] = JSON.parse(item.ノートID集合);
    for (const [index, nid] of nids.entries()) {
      const ankiId = `${item.グループ番号}-${item.漢字}-${nid}`;
      console.log(nid, ankiId);
      await client.note.updateNote({
        note: {
          id: nid,
          fields: {
            [nameof<ClozeNoteFields>("Id")]: ankiId,
          },
        },
      });
    }
  }
  await saveCsv(allItems, DataPaths.inputClozeCsv);
}

await backfillAnkiIds();
