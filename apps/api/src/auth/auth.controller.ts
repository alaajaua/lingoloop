import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Post,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Get("providers") providers() {
    return {
      email: true,
      apple: false,
      google: false,
      registrationMode: "development-preview",
    };
  }
  @Post("signup") @Header("Cache-Control", "no-store") signup(
    @Body() body: unknown,
  ) {
    return this.auth.register(body);
  }
  @Post("login") @Header("Cache-Control", "no-store") login(
    @Body() body: unknown,
  ) {
    return this.auth.login(body);
  }
  @Post("refresh") @Header("Cache-Control", "no-store") refresh(
    @Body() body: unknown,
  ) {
    return this.auth.refresh(body);
  }
  @Post("logout") logout(@Headers("authorization") header?: string) {
    return this.auth.logout(header);
  }
  @Get("me") @Header("Cache-Control", "no-store") me(
    @Headers("authorization") header?: string,
  ) {
    return this.auth.me(header);
  }
}
