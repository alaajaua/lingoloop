import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AuthResponse, AuthUser } from "@lingoloop/types";
const key = "lingoloop.refresh";
const base = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
let accessToken: string | null = null;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function read() {
  return Platform.OS === "web"
    ? sessionStorage.getItem(key)
    : SecureStore.getItemAsync(key);
}
async function save(value: string | null) {
  if (Platform.OS === "web") {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } else if (value) await SecureStore.setItemAsync(key, value);
  else await SecureStore.deleteItemAsync(key);
}
export async function request<T>(
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new ApiError(
      "서버에 연결하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.",
      0,
    );
  }
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      response.status >= 500
        ? "서버에서 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요."
        : typeof data.message === "string"
          ? data.message
          : "요청을 처리하지 못했어요.",
      response.status,
    );
  return data as T;
}
async function accept(result: AuthResponse) {
  await save(result.refreshToken);
  accessToken = result.accessToken;
  return result.user;
}
let restoring: Promise<AuthUser | null> | null = null;
export function restore(): Promise<AuthUser | null> {
  if (restoring) return restoring;
  restoring = (async () => {
    const token = await read();
    if (!token) return null;
    try {
      return await accept(
        await request<AuthResponse>("/auth/refresh", { refreshToken: token }),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await save(null);
        accessToken = null;
        return null;
      }
      throw error;
    }
  })().finally(() => {
    restoring = null;
  });
  return restoring;
}
export async function authenticate(mode: "signup" | "login", data: unknown) {
  return accept(await request<AuthResponse>(`/auth/${mode}`, data));
}
export async function logout() {
  if (!accessToken) await restore();
  if (accessToken) {
    try {
      await request("/auth/logout", {}, accessToken);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      await restore();
      if (accessToken) await request("/auth/logout", {}, accessToken);
    }
  }
  await save(null);
  accessToken = null;
}

export async function authenticatedRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  if (!accessToken) await restore();
  if (!accessToken) throw new ApiError("로그인이 필요해요.", 401);
  try {
    return await request<T>(path, body, accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    await restore();
    if (!accessToken) throw new ApiError("다시 로그인해 주세요.", 401);
    return request<T>(path, body, accessToken);
  }
}
