import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import {
  hashPassword,
  verifyPassword,
  tokenHash,
  newRefreshToken,
} from "./password";
const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(128),
});
const signup = credentials.extend({
  termsAccepted: z.literal(true),
  timezone: z.string().max(80).default("Asia/Seoul"),
});
export const DB = Symbol("DB");
export const AUTH_KEY = Symbol("AUTH_KEY");
@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: PrismaClient,
    @Inject(AUTH_KEY) private readonly key: Uint8Array,
  ) {}
  private parse<T>(schema: z.ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success)
      throw new BadRequestException(
        "이메일, 비밀번호(10~128자), 동의 항목을 확인해 주세요.",
      );
    return result.data;
  }
  private view(user: Prisma.UserGetPayload<{ include: { profile: true } }>) {
    return {
      id: user.id,
      email: user.email,
      profile: user.profile
        ? {
            learningGoals: user.profile.learningGoals,
            selfReportedLevel: user.profile.selfReportedLevel,
            dailyGoal: user.profile.dailyGoal,
            timezone: user.profile.timezone,
            onboardingCompleted: user.profile.onboardingCompleted,
          }
        : null,
    };
  }
  private async access(userId: string, sessionId: string) {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setIssuer("lingoloop")
      .setAudience("lingoloop-mobile")
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(this.key);
  }
  async register(input: unknown) {
    const data = this.parse(signup, input);
    try {
      new Intl.DateTimeFormat("en", { timeZone: data.timezone });
    } catch {
      throw new BadRequestException("시간대를 확인해 주세요.");
    }
    const passwordHash = await hashPassword(data.password);
    const refreshToken = newRefreshToken();
    try {
      return await this.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: data.email,
            passwordHash,
            profile: {
              create: {
                timezone: data.timezone,
                termsVersion: "development-preview-v1",
              },
            },
          },
          include: { profile: true },
        });
        const session = await tx.authSession.create({
          data: {
            userId: user.id,
            refreshHash: tokenHash(refreshToken),
            expiresAt: new Date(Date.now() + 30 * 86400000),
          },
        });
        return {
          user: this.view(user),
          accessToken: await this.access(user.id, session.id),
          refreshToken,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException(
          "이미 가입된 이메일이에요. 로그인해 주세요.",
        );
      throw error;
    }
  }
  async login(input: unknown) {
    const data = this.parse(credentials, input);
    const user = await this.db.user.findUnique({
      where: { email: data.email },
      include: { profile: true },
    });
    // Same expensive hash operation for unknown accounts, avoiding a cheap timing shortcut.
    const valid = user?.passwordHash
      ? await verifyPassword(data.password, user.passwordHash)
      : (await hashPassword(data.password), false);
    if (!user || !valid)
      throw new UnauthorizedException("이메일 또는 비밀번호를 확인해 주세요.");
    const refreshToken = newRefreshToken();
    const session = await this.db.authSession.create({
      data: {
        userId: user.id,
        refreshHash: tokenHash(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    return {
      user: this.view(user),
      accessToken: await this.access(user.id, session.id),
      refreshToken,
    };
  }
  async refresh(input: unknown) {
    const { refreshToken } = this.parse(
      z.object({ refreshToken: z.string().min(40).max(200) }),
      input,
    );
    const replacement = newRefreshToken();
    return this.db.$transaction(async (tx) => {
      const session = await tx.authSession.findUnique({
        where: { refreshHash: tokenHash(refreshToken) },
        include: { user: { include: { profile: true } } },
      });
      if (!session || session.revokedAt || session.expiresAt <= new Date())
        throw new UnauthorizedException("다시 로그인해 주세요.");
      const changed = await tx.authSession.updateMany({
        where: {
          id: session.id,
          refreshHash: tokenHash(refreshToken),
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { refreshHash: tokenHash(replacement) },
      });
      if (changed.count !== 1)
        throw new UnauthorizedException("다시 로그인해 주세요.");
      return {
        user: this.view(session.user),
        accessToken: await this.access(session.userId, session.id),
        refreshToken: replacement,
      };
    });
  }
  async authorize(header?: string) {
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedException();
    let payload;
    try {
      ({ payload } = await jwtVerify(header.slice(7), this.key, {
        algorithms: ["HS256"],
        issuer: "lingoloop",
        audience: "lingoloop-mobile",
      }));
    } catch {
      throw new UnauthorizedException("다시 로그인해 주세요.");
    }
    if (typeof payload.sid !== "string" || !payload.sub)
      throw new UnauthorizedException();
    const session = await this.db.authSession.findUnique({
      where: { id: payload.sid },
      include: { user: { include: { profile: true } } },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    )
      throw new UnauthorizedException();
    return session;
  }
  async me(header?: string) {
    return this.view((await this.authorize(header)).user);
  }
  async logout(header?: string) {
    const session = await this.authorize(header);
    await this.db.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }
}
