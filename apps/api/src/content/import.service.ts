import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import type { ImportPreview, ImportResult } from "@lingoloop/types";
import { DB } from "../auth/auth.service";
import { importKey, parseImport } from "./import-parser";
const fileSchema = z
  .object({ text: z.string().max(1024 * 1024), delimiter: z.enum([",", "\t"]) })
  .strict();
const commitSchema = fileSchema.extend({
  requestId: z.string().uuid(),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
});
const hash = (input: string) =>
  createHash("sha256").update(input).digest("hex");
function parse<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new BadRequestException("파일 요청 형식을 확인해 주세요.");
  return result.data;
}
@Injectable()
export class ImportService {
  constructor(@Inject(DB) private readonly db: PrismaClient) {}
  private async inspect(
    file: z.infer<typeof fileSchema>,
    tx: Prisma.TransactionClient,
  ): Promise<ImportPreview> {
    const rows = parseImport(file.text, file.delimiter);
    // Bounded to the input candidates; existing content is never modified.
    const candidates = rows
      .filter((r) => r.status === "ready" && r.data)
      .map((r) => ({
        lemma: { equals: r.data!.lemma, mode: "insensitive" as const },
        partOfSpeech: {
          equals: r.data!.partOfSpeech,
          mode: "insensitive" as const,
        },
      }));
    const existing = candidates.length
      ? await tx.word.findMany({
          where: { OR: candidates },
          select: { lemma: true, partOfSpeech: true },
        })
      : [];
    const keys = new Set(
      existing.map((w) => importKey(w.lemma, w.partOfSpeech)),
    );
    for (const row of rows)
      if (
        row.status === "ready" &&
        row.data &&
        keys.has(importKey(row.data.lemma, row.data.partOfSpeech))
      ) {
        row.status = "existing";
        row.messages.push(
          "같은 기본형과 품사의 단어가 이미 있어요. 기존 단어는 변경하지 않습니다.",
        );
      }
    const ready = rows.filter((r) => r.status === "ready").length;
    return {
      digest: hash(JSON.stringify({ file, rows })),
      rows,
      total: rows.length,
      ready,
      excluded: rows.length - ready,
    };
  }
  async preview(input: unknown) {
    return this.inspect(parse(fileSchema, input), this.db);
  }
  async commit(input: unknown, actorId: string): Promise<ImportResult> {
    const data = parse(commitSchema, input);
    const file = { text: data.text, delimiter: data.delimiter };
    const inputHash = hash(JSON.stringify(file));
    return this.db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(720104)`;
        const existing = await tx.contentImport.findUnique({
          where: { actorId_requestId: { actorId, requestId: data.requestId } },
        });
        if (existing) {
          if (existing.inputHash !== inputHash)
            throw new ConflictException(
              "같은 요청 ID에 다른 파일을 사용할 수 없어요.",
            );
          return existing.result as unknown as ImportResult;
        }
        const preview = await this.inspect(file, tx);
        if (preview.digest !== data.digest)
          throw new ConflictException(
            "미리보기 후 데이터가 변경됐어요. 파일을 다시 검증해 주세요.",
          );
        if (!preview.ready)
          throw new BadRequestException("등록 가능한 행이 없어요.");
        const wordIds: string[] = [];
        for (const row of preview.rows) {
          if (row.status !== "ready" || !row.data) continue;
          const { meanings, ...fields } = row.data;
          const word = await tx.word.create({
            data: { ...fields, status: "draft" },
          });
          for (const [i, meaning] of meanings.entries()) {
            const { examples, ...fields } = meaning;
            const saved = await tx.wordMeaning.create({
              data: { ...fields, wordId: word.id, senseOrder: i + 1 },
            });
            if (examples.length)
              await tx.example.createMany({
                data: examples.map((e) => ({
                  ...e,
                  wordId: word.id,
                  meaningId: saved.id,
                })),
              });
          }
          await tx.contentAudit.create({
            data: {
              wordId: word.id,
              actorId,
              action: "import",
              toStatus: "draft",
              revision: 1,
            },
          });
          wordIds.push(word.id);
        }
        const result = {
          created: wordIds.length,
          excluded: preview.excluded,
          wordIds,
        };
        await tx.contentImport.create({
          data: { actorId, requestId: data.requestId, inputHash, result },
        });
        return result;
      },
      { timeout: 30000, maxWait: 10000 },
    );
  }
}
