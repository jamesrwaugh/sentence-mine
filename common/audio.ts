// [sound:NDL_3159_Male.ogg] -> NDL_3159_Male.ogg

export function parseAnkiSoundField(sound?: string): string | null {
  const match = sound?.match(/\[sound:(.*)\]/);

  if (!match) {
    return null;
  }

  return match[1] ?? null;
}
