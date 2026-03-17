import { tokenize } from "@enjoyjs/node-mecab";

export async function GetMecabWords(text: string) {
  const tokens = await tokenize(text);

  const badPos = ["助詞", "記号", "BOS/EOS"];
  const formatting = ["<", ">", "b", "</"];

  const items = tokens
    .filter((t) => t.feature.pos && !badPos.includes(t.feature.pos))
    .map((t) => t.feature.basicForm || t.surface);

  return items.filter((item) => !formatting.includes(item));
}
