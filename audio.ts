const HIRAGANA_RANGE: [number, number] = [0x3040, 0x309f];
const KATAKANA_RANGE: [number, number] = [0x30a0, 0x30ff];

const KANA_RANGES = [HIRAGANA_RANGE, KATAKANA_RANGE];

function isCodePointInRanges(codePoint: number, ranges: [number, number][]) {
  for (const [min, max] of ranges) {
    if (codePoint >= min && codePoint <= max) {
      return true;
    }
  }
  return false;
}

function isStringEntirelyKana(str: string) {
  if (str.length === 0) {
    return false;
  }
  for (const c of str) {
    if (!isCodePointInRanges(c.codePointAt(0)!, KANA_RANGES)) {
      return false;
    }
  }
  return true;
}

async function _getInfoJpod101(term: string, reading: string) {
  if (reading === term && isStringEntirelyKana(term)) {
    reading = term;
    term = "";
  }

  const params = new URLSearchParams();
  if (term.length > 0) {
    params.set("kanji", term);
  }
  if (reading.length > 0) {
    params.set("kana", reading);
  }

  const url = `https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?${params.toString()}`;

  return [{ type: "url", url }];
}

const LanguagePodInvalidAudioHash =
  "ae6398b5a27bc8c0a771df6c907ade794be15518174773c58c7c7ddd17098906";

async function arrayBufferDigest(arrayBuffer: ArrayBuffer) {
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new Uint8Array(arrayBuffer))
  );
  let digest = "";
  for (const byte of hash) {
    digest += byte.toString(16).padStart(2, "0");
  }
  return digest;
}

export async function tryDownloadJpod101Audio(
  term: string,
  reading: string
): Promise<string | undefined> {
  const info = await _getInfoJpod101(term, reading);
  const response = await fetch(info[0]!.url);
  const audio = await response.arrayBuffer();
  // Save to file
  const digest = await arrayBufferDigest(audio);
  if (digest === LanguagePodInvalidAudioHash) {
    return undefined;
  }
  const filename = `audio-temp/${term}.mp3`;
  await Bun.write(filename, audio);
  return filename;
}

// const f = await tryDownloadJpod101Audio("同意", "ど");
// console.log(f);
