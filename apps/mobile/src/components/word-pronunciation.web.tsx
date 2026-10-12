import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Copy } from "./auth-ui";
import { DevicePronunciation } from "./device-pronunciation";
type Recording = { audio: string; text?: string; sourceUrl?: string; license?: { name: string; url: string } };
// Shared requests let the next card's lookup start before it is shown.
const requests = new Map<string, Promise<Recording | undefined>>();
const safeUrl = (value?: string) => value?.startsWith("https://") ? value : undefined;
// A slash indicates alternative headwords, not text to pronounce literally.
const toLookup = (word: string) => word.split(" / ")[0]!.trim().toLowerCase();
function request(lookup: string) {
  let pending = requests.get(lookup);
  if (!pending) {
    pending = fetch(`/pronunciation/lookup/${encodeURIComponent(lookup)}`).then(async (response) => {
      if (!response.ok) throw new Error("unavailable");
      const entries = await response.json() as { phonetics?: Recording[] }[];
      const options = entries.flatMap((e) => e.phonetics ?? []).filter((p) => safeUrl(p.audio));
      return options.find((p) => /-uk\.mp3/.test(p.audio)) ?? options[0];
    });
    requests.set(lookup, pending);
    pending.catch(() => requests.delete(lookup));
  }
  return pending;
}
export function prefetchPronunciation(word: string) { request(toLookup(word)).catch(() => undefined); }
export function WordPronunciation({ word }: { word: string }) {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [status, setStatus] = useState("loading");
  const [playing, setPlaying] = useState(false);
  const [device, setDevice] = useState(false);
  const [retry, setRetry] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  const lookup = toLookup(word);
  useEffect(() => {
    setRecording(null); setPlaying(false); setDevice(false); setStatus("loading");
    let active = true;
    // A retry asks again even when the earlier answer had no recording.
    if (retry) requests.delete(lookup);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), 7000); });
    Promise.race([request(lookup), timeout])
      .then((found) => { if (active) { setRecording(found ?? null); setStatus(found ? "ready" : "missing"); } })
      .catch(() => { if (active) setStatus("unavailable"); })
      .finally(() => clearTimeout(timer));
    const player = audio.current;
    return () => { active = false; clearTimeout(timer); player?.pause(); };
  }, [lookup, retry]);
  function play() {
    const player = audio.current;
    if (!player) return;
    if (playing) { player.pause(); setPlaying(false); return; }
    player.currentTime = 0;
    setPlaying(true); setStatus("ready");
    void player.play().catch(() => { setPlaying(false); setStatus("error"); });
  }
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={playing ? "발음 멈추기" : "사전 발음 듣기"}
        accessibilityState={{ disabled: !recording, busy: status === "loading" }} disabled={!recording} onPress={play}
        style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? "#DCE4FF" : "#E8EEFF", opacity: recording ? 1 : 0.45 })}>
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#304DB6" strokeWidth="1.8" aria-hidden="true">
          {playing ? <><path d="M8 5v14M16 5v14" /></> : <><path d="M11 4 5 9H2v6h3l6 5V4Z" strokeLinejoin="round"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" strokeLinecap="round"/></>}
        </svg>
      </Pressable>
      <Text style={{ color: "#62708A", fontSize: 14 }}>{status === "loading" ? "사전 음성 확인 중" : recording ? `${recording.text ?? ""}  사전 음성` : status === "unavailable" ? "음성 연결을 확인해 주세요" : "사전 음성 없음"}</Text>
    </View>
    <audio ref={audio} src={recording?.sourceUrl?.match(/^https:\/\/commons\.wikimedia\.org\/w\/index\.php\?curid=(\d+)$/)?.[1] ? `/pronunciation/commons/${new URL(recording.sourceUrl).searchParams.get("curid")}` : recording?.audio.replace("https://api.dictionaryapi.dev/media/pronunciations/en/", "/pronunciation/audio/")} preload="none" onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setStatus("error"); }} />
    {status === "error" && <Copy error>음성을 불러오지 못했어요. 스피커를 눌러 다시 시도해 주세요.</Copy>}
    {recording && <details style={{ fontSize: 11, color: "#62708A" }}>
      <summary style={{ cursor: "pointer" }}>음성 출처</summary>
      <a href={safeUrl(recording.sourceUrl) ?? "https://dictionaryapi.dev/"} target="_blank" rel="noreferrer">원본 보기</a>
      {safeUrl(recording.license?.url) && <> / <a href={recording.license!.url} target="_blank" rel="noreferrer">{recording.license!.name}</a></>}
    </details>}
    {(status === "missing" || status === "unavailable") && <Pressable accessibilityRole="button" onPress={() => setRetry(retry + 1)}><Copy>음성 다시 확인</Copy></Pressable>}
    {(status === "missing" || status === "unavailable" || status === "error") && !device && <Pressable accessibilityRole="button" onPress={() => setDevice(true)}><Copy>대신 기기 음성 사용</Copy></Pressable>}
    {device && <DevicePronunciation word={lookup} />}
  </View>;
}
