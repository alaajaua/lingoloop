import { useState } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Button, Copy } from "./auth-ui";
export function ExampleAudio({ url }: { url: string }) {
  const uri = url.startsWith("/audio/")
    ? `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001"}${url}`
    : url;
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState(false);
  async function toggle() {
    setError(false);
    try {
      if (status.playing) player.pause();
      else {
        await player.seekTo(0);
        player.play();
      }
    } catch {
      setError(true);
    }
  }
  return (
    <>
      <Button
        secondary
        title={status.playing ? "음성 멈추기" : "예문 듣기"}
        onPress={() => void toggle()}
      />
      {!status.isLoaded && (
        <Copy>
          음성을 불러오는 중이에요. 재생되지 않으면 연결을 확인해 주세요.
        </Copy>
      )}
      {(error || status.error) && (
        <Copy error>음성을 재생하지 못했어요. 다시 눌러 주세요.</Copy>
      )}
    </>
  );
}
