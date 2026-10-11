import { BadRequestException } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import type { ImportRow } from "@lingoloop/types";
import { CSV_HEADERS } from "../../../../packages/types/src/import";
import { contentSchema } from "./content.schema";
export const importKey = (lemma: string, pos: string) =>
  JSON.stringify([lemma.trim().toLowerCase(), pos.trim().toLowerCase()]);
export function parseImport(text: string, delimiter: "," | "\t"): ImportRow[] {
  if (Buffer.byteLength(text, "utf8") > 1024 * 1024)
    throw new BadRequestException("파일은 UTF-8 기준 1MB 이하여야 해요.");
  let records: string[][];
  try {
    records = parse(text, {
      bom: true,
      delimiter,
      skip_empty_lines: true,
      trim: true,
      max_record_size: 65536,
    });
  } catch {
    throw new BadRequestException(
      "CSV 형식이 올바르지 않아요. 따옴표, 구분자와 열 수를 확인해 주세요.",
    );
  }
  const headers = records.shift();
  if (!headers) throw new BadRequestException("빈 파일이에요.");
  const required = [
    "lemma",
    "displayWord",
    "partOfSpeech",
    "difficulty",
    "meaningKo",
  ];
  if (
    new Set(headers).size !== headers.length ||
    required.some((h) => !headers.includes(h)) ||
    headers.some((h) => !(CSV_HEADERS as readonly string[]).includes(h))
  )
    throw new BadRequestException(
      "열 이름이 템플릿과 다르거나 중복돼요. 필수 열: " + required.join(", "),
    );
  if (!records.length || records.length > 500)
    throw new BadRequestException("헤더를 제외하고 1~500행을 넣어 주세요.");
  const keys = records.map((values) => {
    const data = Object.fromEntries(
      headers.map((h, i) => [h, values[i] ?? ""]),
    );
    return importKey(data.lemma ?? "", data.partOfSpeech ?? "");
  });
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return records.map((values, index) => {
    const raw = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
    const row: ImportRow = {
      row: index + 2,
      lemma: raw.lemma ?? "",
      status: "ready",
      messages: [],
    };
    const numeric = (field: string) =>
      raw[field]?.trim() ? Number(raw[field]) : NaN;
    const exampleFields = [
      "sentenceEn",
      "sentenceKo",
      "targetForm",
      "exampleDifficulty",
      "explanation",
      "audioUrl",
    ];
    const hasExample = exampleFields.some((k) => raw[k]?.trim());
    const result = contentSchema.safeParse({
      lemma: raw.lemma,
      displayWord: raw.displayWord,
      partOfSpeech: raw.partOfSpeech,
      difficulty: numeric("difficulty"),
      frequencyRank: raw.frequencyRank?.trim()
        ? numeric("frequencyRank")
        : null,
      tags: raw.tags
        ? raw.tags
            .split("|")
            .map((v) => v.trim())
            .filter(Boolean)
        : [],
      meanings: [
        {
          meaningKo: raw.meaningKo,
          definitionEn: raw.definitionEn ?? "",
          examples: hasExample
            ? [
                {
                  sentenceEn: raw.sentenceEn ?? "",
                  sentenceKo: raw.sentenceKo ?? "",
                  targetForm: raw.targetForm ?? "",
                  difficulty: numeric("exampleDifficulty"),
                  explanation: raw.explanation ?? "",
                  audioUrl: raw.audioUrl ?? "",
                },
              ]
            : [],
        },
      ],
    });
    if (!result.success) {
      row.status = "invalid";
      row.messages = result.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`,
      );
    } else {
      row.data = result.data;
      if (!hasExample)
        row.messages.push(
          "예문 없음: 초안 저장 후 예문을 추가해야 검토 요청할 수 있어요.",
        );
    }
    if ((counts.get(keys[index]!) ?? 0) > 1) {
      row.status = "duplicate";
      row.messages.push(
        "파일 안에 같은 기본형과 품사가 여러 번 있어 모두 제외합니다. 한 행으로 정리해 주세요.",
      );
    }
    return row;
  });
}
