import type { AuthResponse } from "@lingoloop/types";
const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export class AdminApi {
  private access = "";
  private refresh = "";
  private rotating: Promise<void> | null = null;
  async raw<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.access ? { Authorization: `Bearer ${this.access}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(
        path.startsWith("/admin/word-import/") ? 60000 : 10000,
      ),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok)
      throw new ApiError(data.message ?? "요청에 실패했어요.", response.status);
    return data;
  }
  async login(email: string, password: string) {
    const result = await this.raw<AuthResponse>("/auth/login", "POST", {
      email,
      password,
    });
    this.access = result.accessToken;
    this.refresh = result.refreshToken;
    try {
      await this.raw("/admin/me");
    } catch (error) {
      await this.logout().catch(() => {});
      throw error;
    }
  }
  async call<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    try {
      return await this.raw<T>(path, method, body);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || !this.refresh)
        throw error;
      if (!this.rotating)
        this.rotating = this.raw<AuthResponse>("/auth/refresh", "POST", {
          refreshToken: this.refresh,
        })
          .then((result) => {
            this.access = result.accessToken;
            this.refresh = result.refreshToken;
          })
          .finally(() => {
            this.rotating = null;
          });
      await this.rotating;
      return this.raw<T>(path, method, body);
    }
  }
  async logout() {
    try {
      if (this.access) await this.call("/auth/logout", "POST", {});
    } finally {
      this.access = "";
      this.refresh = "";
    }
  }
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "서버 연결을 확인하고 다시 시도해 주세요.";
}
