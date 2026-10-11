import { Module } from "@nestjs/common";
import { Database } from "./database";
import { AuthController } from "./auth.controller";
import { AUTH_KEY, AuthService, DB } from "./auth.service";
@Module({
  exports: [AuthService, DB],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: DB, useFactory: () => new Database() },
    {
      provide: AUTH_KEY,
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32)
          throw new Error("JWT_SECRET must contain at least 32 characters");
        if (process.env.NODE_ENV === "production")
          throw new Error(
            "Production auth is gated until legal documents, email verification and password recovery are configured",
          );
        return new TextEncoder().encode(secret);
      },
    },
  ],
})
export class AuthModule {}
