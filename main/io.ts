import { parse } from "csv";
import { stringify } from "csv/sync";

export async function loadCsv<T>(path: string): Promise<T[]> {
  const result = parse(await Bun.file(path).text(), {
    columns: true,
  });

  const items: T[] = [];

  for await (const _r of result) {
    const row: T = _r as T;
    items.push(row);
  }

  return items;
}

export async function saveCsv<T>(items: T[], path: string) {
  const csv = stringify(items, {
    header: true,
  });

  await Bun.write(path, csv);
}

export async function input(prompt: string): Promise<number | null> {
  process.stdout.write(prompt);

  for await (const line of console) {
    if (line == "n") {
      return null;
    }

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
