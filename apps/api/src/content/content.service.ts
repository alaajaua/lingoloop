import { bundledAudioExists } from "./audio";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { DB } from "../auth/auth.service";
import { contentSchema as content } from "./content.schema";
const statuses = z.enum(["draft", "review", "published", "archived"]);
const include = {
  meanings: {
    orderBy: { senseOrder: "asc" as const },
    include: { examples: { orderBy: { id: "asc" as const } } },
  },
};
function parse<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new BadRequestException(
      result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  return result.data;
}
@Injectable()
export class ContentService {
  constructor(@Inject(DB) private readonly db: PrismaClient) {}
  private async sync(
    tx: Prisma.TransactionClient,
    wordId: string,
    meanings: z.infer<typeof content>["meanings"],
  ) {
    const existing = await tx.wordMeaning.findMany({
      where: { wordId },
      include: { examples: true },
    });
    const meaningIds = meanings.flatMap((m) => (m.id ? [m.id] : []));
    const exampleIds = meanings.flatMap((m) =>
      m.examples.flatMap((e) => (e.id ? [e.id] : [])),
    );
    if (
      new Set(meaningIds).size !== meaningIds.length ||
      new Set(exampleIds).size !== exampleIds.length
    )
      throw new BadRequestException("중복된 콘텐츠 ID예요.");
    for (const m of meanings) {
      if (m.id && !existing.some((old) => old.id === m.id))
        throw new BadRequestException("잘못된 의미 ID예요.");
      for (const e of m.examples)
        if (
          e.id &&
          !existing
            .find((old) => old.id === m.id)
            ?.examples.some((old) => old.id === e.id)
        )
          throw new BadRequestException("잘못된 예문 ID예요.");
    }
    // Free positive order slots before reorder, retaining persistent content IDs.
    for (const [index, m] of existing.entries())
      await tx.wordMeaning.update({
        where: { id: m.id },
        data: { senseOrder: -(index + 1) },
      });
    await tx.wordMeaning.deleteMany({
      where: { wordId, id: { notIn: meaningIds } },
    });
    for (const [index, m] of meanings.entries()) {
      const { id, examples, ...fields } = m;
      const data = { ...fields, wordId, senseOrder: index + 1 };
      const saved = id
        ? await tx.wordMeaning.update({ where: { id }, data })
        : await tx.wordMeaning.create({ data });
      await tx.example.deleteMany({
        where: {
          meaningId: saved.id,
          id: { notIn: examples.flatMap((e) => (e.id ? [e.id] : [])) },
        },
      });
      for (const e of examples) {
        const { id, ...fields } = e;
        const data = { ...fields, wordId, meaningId: saved.id };
        if (id) await tx.example.update({ where: { id }, data });
        else await tx.example.create({ data });
      }
    }
  }
  async list(query: unknown) {
    const q = parse(
      z.object({
        q: z.string().max(100).default(""),
        status: statuses.optional(),
        page: z.coerce.number().int().min(1).max(10000).default(1),
      }),
      query,
    );
    const where = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.q
        ? {
            OR: [
              { lemma: { contains: q.q, mode: "insensitive" as const } },
              { displayWord: { contains: q.q, mode: "insensitive" as const } },
              { meanings: { some: { meaningKo: { contains: q.q } } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.word.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip: (q.page - 1) * 20,
        take: 20,
        include,
      }),
      this.db.word.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: 20 };
  }
  async get(id: string) {
    const word = await this.db.word.findUnique({ where: { id }, include });
    if (!word) throw new NotFoundException("단어를 찾을 수 없어요.");
    return word;
  }
  async create(input: unknown, actorId: string) {
    const data = parse(content, input);
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(720104)`;
      const { meanings, ...fields } = data;
      const word = await tx.word.create({ data: fields });
      await this.sync(tx, word.id, meanings);
      await tx.contentAudit.create({
        data: {
          wordId: word.id,
          actorId,
          action: "create",
          toStatus: "draft",
          revision: 1,
        },
      });
      return tx.word.findUniqueOrThrow({ where: { id: word.id }, include });
    });
  }
  async update(id: string, input: unknown, actorId: string) {
    const { revision, ...data } = parse(
      content.extend({ revision: z.number().int().positive() }),
      input,
    );
    return this.db.$transaction(async (tx) => {
      const word = await tx.word.findUnique({ where: { id } });
      if (!word) throw new NotFoundException();
      if (word.status !== "draft")
        throw new ConflictException("초안으로 되돌린 뒤 수정해 주세요.");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(720104)`;
      const { meanings, ...fields } = data;
      const changed = await tx.word.updateMany({
        where: { id, revision, status: "draft" },
        data: { ...fields, revision: { increment: 1 } },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          "다른 작업자가 수정했어요. 최신 내용을 다시 불러와 주세요.",
        );
      await this.sync(tx, id, meanings);
      await tx.contentAudit.create({
        data: {
          wordId: id,
          actorId,
          action: "edit",
          fromStatus: "draft",
          toStatus: "draft",
          revision: revision + 1,
        },
      });
      return tx.word.findUniqueOrThrow({ where: { id }, include });
    });
  }
  async transition(id: string, input: unknown, actorId: string) {
    const { status, revision } = parse(
      z
        .object({ status: statuses, revision: z.number().int().positive() })
        .strict(),
      input,
    );
    return this.db.$transaction(async (tx) => {
      const word = await tx.word.findUnique({ where: { id }, include });
      if (!word) throw new NotFoundException();
      const allowed: Record<string, string[]> = {
        draft: ["review", "archived"],
        review: ["draft", "published", "archived"],
        published: ["draft", "archived"],
        archived: ["draft"],
      };
      if (!allowed[word.status]?.includes(status))
        throw new ConflictException("허용되지 않는 상태 변경이에요.");
      if (status === "review" || status === "published") {
        if (
          !word.meanings.length ||
          word.meanings.some((m) => !m.examples.length)
        )
          throw new BadRequestException(
            "각 의미마다 예문을 하나 이상 등록해 주세요.",
          );
        for (const meaning of word.meanings)
          for (const e of meaning.examples) {
            if (
              !e.sentenceEn.toLowerCase().includes(e.targetForm.toLowerCase())
            )
              throw new BadRequestException(
                "예문에 정답 형태가 포함되어야 해요.",
              );
            if (
              status === "published" &&
              (!e.explanation?.trim() ||
                !e.audioUrl ||
                (e.audioUrl.startsWith("/") && !bundledAudioExists(e.audioUrl)))
            )
              throw new BadRequestException(
                "게시하려면 모든 예문의 설명과 HTTPS 오디오 URL 또는 등록된 음성 파일이 필요해요.",
              );
          }
      }
      const changed = await tx.word.updateMany({
        where: { id, revision, status: word.status },
        data: { status, revision: { increment: 1 } },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          "다른 작업자가 수정했어요. 최신 내용을 다시 불러와 주세요.",
        );
      await tx.contentAudit.create({
        data: {
          wordId: id,
          actorId,
          action: "status",
          fromStatus: word.status,
          toStatus: status,
          revision: revision + 1,
        },
      });
      return tx.word.findUniqueOrThrow({ where: { id }, include });
    });
  }
  async history(id: string) {
    await this.get(id);
    return this.db.contentAudit.findMany({
      where: { wordId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
