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

type DownloadResult =
  | {
      url: string;
      audio: ArrayBuffer;
      valid: true;
    }
  | {
      url: undefined;
      audio: undefined;
      valid: false;
    };

async function _getInfoJpod101(
  term: string,
  reading: string
): Promise<DownloadResult> {
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

  const response = await fetch(url);
  const audio = await response.arrayBuffer();
  const digest = await arrayBufferDigest(audio);

  if (digest === LanguagePodInvalidAudioHash) {
    return {
      url: undefined,
      audio: undefined,
      valid: false,
    };
  }

  return {
    url,
    audio,
    valid: true,
  };
}

async function _getInfoJpod101Alt(term: string): Promise<DownloadResult> {
  const params = new URLSearchParams();
  params.append("post", "dictionary_reference");
  params.append("match_type", "exact");
  params.append("search_query", term);

  const requestOptions = {
    method: "POST",
    body: params,
    redirect: "follow" as const,
  };

  const response = await fetch(
    "https://www.japanesepod101.com/learningcenter/reference/dictionary_post",
    requestOptions
  );

  /*
    Returns a page with:

    <audio preload="none" controls>
      <source src="https://d1pra95f92lrn3.cloudfront.net/audio/375292.mp3" type="audio/mp3">
    </audio>
  */

  const text = await response.text();

  const audioUrl = text.match(/<source src="([^"]+)" type="audio\/mp3">/)?.[1];

  if (!audioUrl) {
    return {
      url: undefined,
      audio: undefined,
      valid: false,
    };
  }

  const audio = await fetch(audioUrl).then((r) => r.arrayBuffer());

  return {
    url: audioUrl,
    audio,
    valid: true,
  };
}

const methods = [_getInfoJpod101, _getInfoJpod101Alt];

export async function tryDownloadTermAudio(
  term: string,
  reading: string
): Promise<string | undefined> {
  for (const method of methods) {
    const info = await method(term, reading);
    if (info.valid) {
      const filename = `audio-temp/${term}.mp3`;
      await Bun.write(filename, info.audio);
      return filename;
    }
  }

  return undefined;
}

// const f = await tryDownloadJpod101Audio("同意", "ど");
// console.log(f);
