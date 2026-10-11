import { PrismaClient } from "@prisma/client";
import type { OnModuleDestroy } from "@nestjs/common";
export class Database extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
