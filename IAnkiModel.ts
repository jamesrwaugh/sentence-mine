export interface IAnkiModel {
  id: number;
  name: string;
  mtime_secs: number;
  usn: number;
  config: Config;
  tmpls: Tmpl[];
  flds: Fld[];
}

export interface Config {
  type: Type;
  data: number[];
}

export enum Type {
  Buffer = "Buffer",
}

export interface Fld {
  ntid: number;
  ord: number;
  name: string;
  config: Config;
}

export interface Tmpl {
  ntid: number;
  ord: number;
  name: string;
  mtime_secs: number;
  usn: number;
  config: string;
  qfmt: string;
  afmt: string;
}
