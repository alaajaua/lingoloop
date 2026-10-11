import { LearningModule } from "./learning/learning.module";
import { ContentModule } from "./content/content.module";
import { AuthModule } from "./auth/auth.module";
import { Controller, Get, Module } from "@nestjs/common";
import type { HealthResponse } from "@lingoloop/types";
@Controller("health")
export class HealthController {
  @Get()
  health(): HealthResponse {
    return { status: "ok", service: "lingoloop-api" };
  }
}
@Module({
  imports: [AuthModule, ContentModule, LearningModule],
  controllers: [HealthController],
})
export class AppModule {}
