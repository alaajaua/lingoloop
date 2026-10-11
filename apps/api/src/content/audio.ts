import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
export const AUDIO_ROOT = resolve(
  dirname(require.resolve("@lingoloop/api/package.json")),
  "public/audio",
);
export const bundledAudioPattern = /^\/audio\/[a-f0-9]{64}\.wav$/;
export function bundledAudioExists(url: string): boolean {
  return (
    bundledAudioPattern.test(url) &&
    existsSync(resolve(AUDIO_ROOT, url.slice("/audio/".length)))
  );
}
