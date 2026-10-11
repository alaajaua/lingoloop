import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
const derive = (password: string, salt: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [, salt, expected] = hash.split(":");
  if (!salt || !expected) return false;
  const actual = await derive(password, salt);
  const decoded = Buffer.from(expected, "hex");
  return actual.length === decoded.length && timingSafeEqual(actual, decoded);
}
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const newRefreshToken = () => randomBytes(48).toString("base64url");
