export function removeHtmlTags(s: string) {
  return s.replaceAll(/<[^>]*>?/gi, "");
}
