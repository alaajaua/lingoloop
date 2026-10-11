import "reflect-metadata";
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { ContentService } from "../apps/api/src/content/content.service";
const db = new PrismaClient();
async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname != "/lingoloop"
  )
    throw Error("Local development DB only");
  const actor = await db.user.findUniqueOrThrow({
    where: { email: process.argv[2] ?? "" },
  });
  if (actor.role !== "admin") throw Error("Admin required");
  const records: {
    word: string;
    meaning: string;
    pos: string;
    difficulty: number;
    sentence: string;
    translation: string;
    note: string;
    audioUrl: string;
  }[] = JSON.parse(readFileSync("data/starter-words.json", "utf8"));
  const svc = new ContentService(db);
  for (const r of records) {
    let w = await db.word.findFirst({
      where: {
        lemma: { equals: r.word, mode: "insensitive" },
        partOfSpeech: r.pos,
      },
      include: { meanings: { include: { examples: true } } },
    });
    if (w && !w.tags.includes("starter-v1")) {
      console.log("Existing content preserved:", r.word);
      continue;
    }
    if (!w)
      w = await svc.create(
        {
          lemma: r.word,
          displayWord: r.word,
          partOfSpeech: r.pos,
          difficulty: r.difficulty,
          tags: ["starter-v1"],
          meanings: [
            {
              meaningKo: r.meaning,
              examples: [
                {
                  sentenceEn: r.sentence,
                  sentenceKo: r.translation,
                  targetForm: r.word,
                  explanation: r.note,
                  audioUrl: r.audioUrl,
                  difficulty: r.difficulty,
                },
              ],
            },
          ],
        },
        actor.id,
      );
    if (w.status === "draft")
      w = await svc.transition(
        w.id,
        { status: "review", revision: w.revision },
        actor.id,
      );
    if (w.status === "review")
      w = await svc.transition(
        w.id,
        { status: "published", revision: w.revision },
        actor.id,
      );
    console.log(w.lemma, w.status);
  }
}
main().finally(() => db.$disconnect());
