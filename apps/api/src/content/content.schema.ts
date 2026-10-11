import { z } from "zod";
import { bundledAudioPattern } from "./audio";
const text = z.string().trim().min(1).max(2000);
const example = z
  .object({
    id: z.string().optional(),
    sentenceEn: text,
    sentenceKo: text,
    targetForm: text,
    explanation: z.string().trim().max(2000).optional(),
    audioUrl: z
      .union([
        z.literal(""),
        z.string().regex(bundledAudioPattern),
        z
          .string()
          .url()
          .refine((v) => v.startsWith("https://"), "HTTPS URL required"),
      ])
      .optional(),
    difficulty: z.number().min(1).max(30),
  })
  .strict();
export const contentSchema = z
  .object({
    lemma: text.max(100),
    displayWord: text.max(100),
    partOfSpeech: text.max(50),
    difficulty: z.number().min(1).max(30),
    frequencyRank: z.number().int().positive().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
    meanings: z
      .array(
        z
          .object({
            id: z.string().optional(),
            meaningKo: text,
            definitionEn: z.string().trim().max(2000).optional(),
            examples: z.array(example).max(20),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();
