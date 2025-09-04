import { parse } from "csv";
import { stringify } from "csv/sync";

export interface CsvItem {
  漢字: string;
  絵: string;
  例文: string;
  ノートID: string;
  NoteImage: string;
  Error: string;
}

export async function loadCsv(): Promise<CsvItem[]> {
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

  return items;
}

export async function saveCsv(items: CsvItem[]) {
  const csv = stringify(items, {
    header: true,
  });

  await Bun.write("/home/james/Dropbox/SentenceMine.csv", csv);
}

export async function input(prompt: string): Promise<number> {
  process.stdout.write(prompt);
  for await (const line of console) {
    const index = parseInt(line);
    if (isNaN(index)) {
      console.log(`"${line}" is not a number`);
      process.stdout.write(prompt);
      continue;
    }
    return index;
  }
  throw new Error("No input");
}
