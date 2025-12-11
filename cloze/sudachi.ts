import dargs from "dargs";
import { execa } from "execa";

interface SudachiOptions {
  all?: boolean;
}

interface SudachiLine {
  surface: string | undefined;
  pos: string | undefined;
  normalized: string | undefined;
  dictionary: string | undefined;
  reading: string | undefined;
  dictionaryId: string | undefined;
  synonymGroupIds: string[] | undefined;
  oov: string | undefined;
}

export const analyze = async (
  text: string,
  options: Readonly<SudachiOptions> = { all: true }
): Promise<SudachiLine[]> => {
  const { stdout } = await execa("sudachi", dargs(options), { input: text });
  return parseSudachiOutput(stdout);
};

function parseSudachiOutput(output: string): SudachiLine[] {
  /*
  Example output:

    Columns are tab separated.

    Surface
    Part-of-Speech Tags (comma separated)
    Normalized Form
    Dictionary Form
    Reading Form
    Dictionary ID 
    Synonym group IDs
    (OOV) if a word is Out-of-Vocabulary (not in the dictionary)
  
教師    名詞,普通名詞,一般,*,*,*        教師    教師    キョウシ        0       [21495]
が      助詞,格助詞,*,*,*,*     が      が      ガ      0       []
生徒    名詞,普通名詞,一般,*,*,*        生徒    生徒    セイト  0       [14393]
たち    接尾辞,名詞的,一般,*,*,*        達      たち    タチ    0       []
に      助詞,格助詞,*,*,*,*     に      に      ニ      0       []
注意    名詞,普通名詞,サ変可能,*,*,*    注意    注意    チュウイ        0       [11063, 18957, 23157]
を      助詞,格助詞,*,*,*,*     を      を      ヲ      0       []
呼びかけ        動詞,一般,*,*,下一段-カ行,連用形-一般   呼び掛ける      呼びかける      ヨビカケ        0       []
た      助動詞,*,*,*,助動詞-タ,終止形-一般      た      た      タ      0       []
。      補助記号,句点,*,*,*,*   。      。      。      0       []
EOS
  */

  const lines = output.split("\n");
  const words: SudachiLine[] = lines.map((line) => {
    const [
      surface,
      pos,
      normalized,
      dictionary,
      reading,
      dictionaryId,
      synonymGroupIds,
      oov,
    ] = line.split("\t");
    return {
      surface,
      pos,
      normalized,
      dictionary,
      reading,
      dictionaryId,
      synonymGroupIds: synonymGroupIds ? synonymGroupIds.split(",") : undefined,
      oov,
    };
  });
  return words;
}
