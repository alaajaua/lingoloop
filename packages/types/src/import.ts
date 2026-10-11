import type { WordInput } from "./content";
export type ImportRow = {
  row: number;
  lemma: string;
  status: "ready" | "invalid" | "duplicate" | "existing";
  messages: string[];
  data?: WordInput;
};
export type ImportPreview = {
  digest: string;
  rows: ImportRow[];
  total: number;
  ready: number;
  excluded: number;
};
export type ImportResult = {
  created: number;
  excluded: number;
  wordIds: string[];
};
export const CSV_HEADERS = [
  "lemma",
  "displayWord",
  "partOfSpeech",
  "difficulty",
  "meaningKo",
  "definitionEn",
  "frequencyRank",
  "tags",
  "sentenceEn",
  "sentenceKo",
  "targetForm",
  "exampleDifficulty",
  "explanation",
  "audioUrl",
] as const;
