import { config } from "dotenv";
import { resolve } from "node:path";
import { rateLimit } from "express-rate-limit";
config({ path: resolve(process.cwd(), "../../.env") });
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AUDIO_ROOT } from "./content/audio";
import { AppModule } from "./app.module";
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(AUDIO_ROOT, {
    prefix: "/audio/",
    index: false,
    dotfiles: "deny",
  });
  app.useBodyParser("json", { limit: "2mb" });
  app.enableCors({
    origin: (
      process.env.CORS_ORIGINS ?? "http://localhost:8081,http://localhost:3000"
    ).split(","),
  });
  app.use(
    "/auth",
    rateLimit({
      windowMs: 60_000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { message: "요청이 많아요. 잠시 후 다시 시도해 주세요." },
    }),
  );
  app.enableShutdownHooks();
  await app.listen(
    Number(process.env.PORT ?? 3001),
    process.env.HOST ?? "127.0.0.1",
  );
}
void bootstrap();
