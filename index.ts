import { loadDictionary } from "./dictionary";
import { searchSentences } from "./search_sentence";

const dictionary = await loadDictionary();

console.log("Enter a word to search for:");
const input = await Bun.stdin.text();
const sentences = await searchSentences(input, dictionary);

for (const sentence of sentences) {
  console.log(sentence);
}

console.log("Pick which to add:");
const choice = await Bun.stdin.text();
const index = parseInt(choice);
const sentence = sentences[index];
console.log(sentence);
