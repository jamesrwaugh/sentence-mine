import { loadDictionary } from "./dictionary";

const dictEntries = await loadDictionary();
console.log(dictEntries);
const meaning = fishForMeaningTopLevel(dictEntries.at(0)!.glossary.at(0)!);
console.log(meaning);
