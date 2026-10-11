import { useEffect, useRef, useState } from "react";
import { Pressable, Text } from "react-native";
import * as Speech from "expo-speech";
import { Copy } from "./auth-ui";
export function DevicePronunciation({ word }: { word: string }) {
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const voice = useRef<Speech.Voice | null>(null);
  const active = useRef(true);
  const generation = useRef(0);
  useEffect(() => {
    active.current = true;
    void Speech.getAvailableVoicesAsync().then((voices) => {
      const english = voices.filter((v) => /^en([-_]|$)/i.test(v.language));
      const score = (v: Speech.Voice) => Number(v.quality === Speech.VoiceQuality.Enhanced) * 100 + Number(/natural|premium|enhanced/i.test(v.name)) * 50 + Number(/^en[-_]US$/i.test(v.language)) * 10;
      if (active.current) voice.current = english.sort((a, b) => score(b) - score(a))[0] ?? null;
    }).catch(() => {});
    return () => { active.current = false; generation.current++; void Speech.stop().catch(() => {}); };
  }, [word]);
  function speak() {
    setError(false);
    const current = ++generation.current;
    const update = (failed = false) => { if (active.current && generation.current === current) { setPlaying(false); setError(failed); } };
    try {
      void Speech.stop().catch(() => update(true));
      if (playing) { setPlaying(false); return; }
      const selected = voice.current;
      Speech.speak(word, {
        language: selected?.language ?? "en-US", voice: selected?.identifier,
        rate: 1, pitch: 1,
        onStart: () => { if (active.current && generation.current === current) setPlaying(true); },
        onDone: () => update(), onStopped: () => update(), onError: () => update(true),
      });
    } catch { update(true); }
  }
  return <>
    <Copy>기기 합성음</Copy>
    <Pressable accessibilityRole="button" accessibilityLabel={playing ? "발음 멈추기" : "발음 듣기"} accessibilityHint="영어 단어의 발음을 재생합니다"
      onPress={speak} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? "#DCE4FF" : "#E8EEFF" })}>
      <Text accessible={false} style={{fontSize: 25}}>{playing ? "⏹" : "🔊"}</Text>
    </Pressable>
    {error && <Copy error>발음을 재생하지 못했어요. 기기의 영어 음성과 소리 설정을 확인해 주세요.</Copy>}
  </>;
}
