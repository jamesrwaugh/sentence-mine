import { parse } from "csv";
import { stringify } from "csv/sync";
import { DataPaths } from "./IDataItems";

export interface InCsvItem {
  漢字: string;
  絵: string;
  例文: string;
  ノートID: string;
  NoteImage: string;
  Error: string;
}

export async function loadCsv(): Promise<InCsvItem[]> {
  const result = parse(await Bun.file(DataPaths.inputCsv).text(), {
    columns: true,
  });

  const items: InCsvItem[] = [];

  for await (const _r of result) {
    const row: InCsvItem = _r as InCsvItem;
    items.push(row);
  }

  return items;
}

export async function saveCsv(items: InCsvItem[]) {
  const csv = stringify(items, {
    header: true,
  });

  await Bun.write(DataPaths.inputCsv, csv);
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
