import { ImportService } from "./import.service";
import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  ForbiddenException,
  Header,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ContentService } from "./content.service";
@Controller("admin")
export class ContentController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ImportService) private readonly importer: ImportService,
    @Inject(ContentService) private readonly content: ContentService,
  ) {}
  private async admin(header?: string) {
    const session = await this.auth.authorize(header);
    if (session.user.role !== "admin")
      throw new ForbiddenException("관리자 권한이 필요해요.");
    return session.userId;
  }
  @Get("me") @Header("Cache-Control", "no-store") async me(
    @Headers("authorization") header?: string,
  ) {
    return { id: await this.admin(header), role: "admin" };
  }
  @Get("words") async list(
    @Headers("authorization") header: string,
    @Query() query: unknown,
  ) {
    await this.admin(header);
    return this.content.list(query);
  }
  @Post("word-import/preview") async preview(
    @Headers("authorization") header: string,
    @Body() body: unknown,
  ) {
    await this.admin(header);
    return this.importer.preview(body);
  }
  @Post("word-import/commit") async commit(
    @Headers("authorization") header: string,
    @Body() body: unknown,
  ) {
    return this.importer.commit(body, await this.admin(header));
  }
  @Get("words/:id") async get(
    @Headers("authorization") header: string,
    @Param("id") id: string,
  ) {
    await this.admin(header);
    return this.content.get(id);
  }
  @Post("words") async create(
    @Headers("authorization") header: string,
    @Body() body: unknown,
  ) {
    return this.content.create(body, await this.admin(header));
  }
  @Patch("words/:id") async update(
    @Headers("authorization") header: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.content.update(id, body, await this.admin(header));
  }
  @Post("words/:id/status") async status(
    @Headers("authorization") header: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.content.transition(id, body, await this.admin(header));
  }
  @Get("words/:id/history") async history(
    @Headers("authorization") header: string,
    @Param("id") id: string,
  ) {
    await this.admin(header);
    return this.content.history(id);
  }
}
