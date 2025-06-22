import { loadDictionary } from "./dictionary";
import { loadSentenceDeck, searchSentences } from "./search_sentence";

const deck = await loadSentenceDeck();
const dictionary = await loadDictionary();

const result = await searchSentences("何たる", deck, dictionary);

console.log(result);
