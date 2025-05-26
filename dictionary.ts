import type {
  ContentWTag,
  TopLevelContent,
  YomichanDictEntry,
} from "./dictionary_type";

function getGlossaryContents(item: ContentWTag): string[] {
  if (Array.isArray(item.content)) {
    return item.content.flatMap((content) => getGlossaryContents(content));
  } else if (typeof item.content === "object") {
    return getGlossaryContents(item.content);
  } else {
    return [item.content];
  }
}

interface Meaning {
  meaning: string;
  id: string;
}

function fishForMeaning(item: ContentWTag, depth: number): Meaning[] {
  const d = item.data;

  if (d?.["content"] === "glossary") {
    const glossary = getGlossaryContents(item);
    const id = crypto.randomUUID();
    return glossary.map((meaning) => ({ meaning, id }));
  }

  if (Array.isArray(item.content)) {
    return item.content.flatMap((content) =>
      fishForMeaning(content, depth + 1)
    );
  } else if (typeof item.content === "object") {
    return fishForMeaning(item.content, depth + 1);
  } else {
    // Reached a leaf node, do nothing
  }

  return [];
}

function fishForMeaningTopLevel(item: TopLevelContent): Meaning[] {
  if (Array.isArray(item.content)) {
    return item.content.flatMap((content) => fishForMeaning(content, 0));
  } else {
    return fishForMeaning(item.content, 0);
  }
}

async function loadDictionaryFromJson(
  file: string
): Promise<YomichanDictEntry[]> {
  const json: any[][] = await Bun.file(file).json();
  const more = json.map(
    (entry) =>
      ({
        expression: entry[0],
        reading: entry[1],
        definitionTags: entry[2],
        rules: entry[3],
        score: entry[4],
        glossary: entry[5],
        sequence: entry[6],
        termTags: entry[7],
      } as YomichanDictEntry)
  );
  return more;
}

export async function loadDictionary(): Promise<YomichanDictEntry[]> {
  // const glob = new Bun.Glob("jitendex-yomitan/term_bank_*.json");
  const glob = new Bun.Glob("jitendex-yomitan/term_bank_210.json");
  const dictEntries: YomichanDictEntry[] = [];
  for await (const file of glob.scan()) {
    const more = await loadDictionaryFromJson(file);
    dictEntries.push(...more);
  }
  return dictEntries;
}

interface DictionaryEntry {
  expression: string;
  reading: string;
  glossary: Meaning[];
}

const dictEntries = await loadDictionary();

for (const entry of dictEntries) {
  const meanings = fishForMeaningTopLevel(entry.glossary[0]!);
  const dictEntry: DictionaryEntry = {
    expression: entry.expression,
    reading: entry.reading,
    glossary: meanings,
  };
  console.log(dictEntry);
}
