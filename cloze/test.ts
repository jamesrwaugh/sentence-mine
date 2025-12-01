// import { tokenize } from "@enjoyjs/node-mecab";
// import { GetMecabWords } from "../main/mecab";
// import { searchGrok } from "./grok";
// import { getClozeSentenceMecab } from "./add_cards";
// import sudachi from "@nikkei/napi-sudachi";
// import { execa } from "execa";
// import dargs from "dargs";
// import { loadDataItems } from "../main/data_items";
// import { loadDictionary } from "../main/dictionary";

import { getClozeSentence } from "./add_cards";
import { analyze } from "./sudachi";

// async function test1() {
//   const result = await searchGrok("頼る", 2);
//   console.log(JSON.stringify(result, null, 2));
// }

// async function test2() {
//   const tokenizer = new sudachi.Tokenizer();
//   const mode = sudachi.SplitMode.c();

//   const testText = "呼び掛ける";
//   const morphemes = tokenizer.tokenize(testText, mode);

//   console.write(morphemes);
// }

async function test3() {
  const stdout = await analyze("教師が生徒たちに注意を呼びかけた。", {
    all: true,
  });
  console.log(stdout);
}

// async function test4() {
//   const data = await loadDictionary();
//   const b = data["呼び掛ける"];
//   console.log(b);
// }

const words = await getClozeSentence(
  "呼び掛ける",
  "教師が生徒たちに注意を呼びかけた。"
);

console.log(words);

// await test3();
