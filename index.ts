import { loadYomichanDictionary } from "./dictionary";

const dictEntries = await loadYomichanDictionary();
console.log(dictEntries);
const meaning = fishForMeaningTopLevel(dictEntries.at(0)!.glossary.at(0)!);
console.log(meaning);
