export interface ContentWTag {
  tag: string;
  data?: Record<string, any>;
  content: ContentWTag[] | ContentWTag | string;
}

export interface TopLevelContent {
  type: string;
  content: ContentWTag[] | ContentWTag;
}

export interface YomichanDictEntry {
  expression: string;
  reading: string;
  definitionTags: string;
  rules: string;
  score: number;
  glossary: TopLevelContent[];
  sequence: number;
  termTags: string;
}
