export type StudyCard = {
  wordId: string;
  word: string;
  difficulty: number;
  meaning: string;
  answer: string;
  sentence: string;
  full: string;
  translation: string;
  note: string;
  audioUrl?: string;
};
type ContentWord = {
  id: string;
  lemma: string;
  difficulty: number;
  meanings: {
    meaningKo: string;
    examples: {
      targetForm: string;
      sentenceEn: string;
      sentenceKo: string;
      explanation: string | null;
      audioUrl: string | null;
    }[];
  }[];
};
export function makeStudyCard(word: ContentWord): StudyCard | null {
  for (const meaning of word.meanings)
    for (const example of meaning.examples) {
      const escaped = example.targetForm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(
        `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
        "giu",
      );
      if (!example.targetForm.trim() || !pattern.test(example.sentenceEn))
        continue;
      return {
        wordId: word.id,
        word: word.lemma,
        difficulty: word.difficulty,
        meaning: meaning.meaningKo,
        answer: example.targetForm,
        sentence: example.sentenceEn.replace(pattern, "_____"),
        full: example.sentenceEn,
        translation: example.sentenceKo,
        note: example.explanation ?? "",
        ...(example.audioUrl ? { audioUrl: example.audioUrl } : {}),
      };
    }
  return null;
}
