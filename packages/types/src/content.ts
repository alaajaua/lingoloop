export type ContentStatus = "draft" | "review" | "published" | "archived";
export type ExampleInput = {
  id?: string;
  sentenceEn: string;
  sentenceKo: string;
  targetForm: string;
  explanation?: string;
  audioUrl?: string;
  difficulty: number;
};
export type MeaningInput = {
  id?: string;
  meaningKo: string;
  definitionEn?: string;
  examples: ExampleInput[];
};
export type WordInput = {
  lemma: string;
  displayWord: string;
  partOfSpeech: string;
  difficulty: number;
  frequencyRank?: number | null;
  tags: string[];
  meanings: MeaningInput[];
};
export type WordRecord = WordInput & {
  id: string;
  status: ContentStatus;
  revision: number;
  updatedAt: string;
};
export type WordList = {
  items: WordRecord[];
  total: number;
  page: number;
  pageSize: number;
};
export type ContentAudit = {
  id: string;
  actorId: string;
  action: string;
  fromStatus: ContentStatus | null;
  toStatus: ContentStatus;
  revision: number;
  createdAt: string;
};
