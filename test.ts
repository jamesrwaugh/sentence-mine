import { parse } from "csv";
import { stringify } from "csv/sync";

interface CsvItem {
  漢字: string;
  絵: string;
  例文: string;
  ノートID: string;
}

const result = parse(
  await Bun.file("/home/james/Dropbox/SentenceMine.csv").text(),
  {
    columns: true,
  }
);

const items: CsvItem[] = [];

for await (const _r of result) {
  const row: CsvItem = _r as CsvItem;
  items.push(row);
}

const csv = stringify(items, {
  header: true,
});

await Bun.write("/home/james/Dropbox/SentenceMine_2.csv", csv);

console.log(csv);
