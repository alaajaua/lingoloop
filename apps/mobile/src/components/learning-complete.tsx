import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import type { LearningView, ProgressOverview } from "@lingoloop/types";
import { authenticatedRequest } from "../services/session";
import { Heading, Copy, Button, styles } from "./auth-ui";

export function LearningComplete({ session, busy, onContinue }: {
  session: LearningView;
  busy: boolean;
  onContinue: () => void;
}) {
  const [data, setData] = useState<ProgressOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    void authenticatedRequest<ProgressOverview>("/progress/overview")
      .then((result) => { if (active) setData(result); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "오늘의 현황을 불러오지 못했어요."); });
    return () => { active = false; };
  }, [session.id, reload]);
  return <>
    <Heading>{session.wordCount}개 모두 스스로 떠올렸어요!</Heading>
    <Copy>이번 학습에서 총 {session.cursor}번 답했어요. 기록은 계정에 저장됐습니다. 시간이 지난 뒤 다시 떠올리며 기억을 확인해요.</Copy>
    {data ? <>
      <View style={styles.card}>
        <Copy>오늘의 성과</Copy>
        <Heading>{data.daily.answered} / {data.daily.goal}문제</Heading>
        <Copy>{data.daily.remaining === 0 ? "오늘 목표를 달성했어요! 편하게 마무리해도 좋아요." : `목표까지 ${data.daily.remaining}문제 남았어요. 지금 쉬었다가 이어가도 괜찮아요.`}</Copy>
        <Copy>오답과 반복 풀이를 포함한 횟수예요. {data.daily.timezone} 기준</Copy>
      </View>
      <View style={styles.card}>
        <Heading>{data.due ? `복습할 단어 ${data.due}개가 남았어요` : "다음 복습을 준비했어요"}</Heading>
        <Copy>{data.nextReviewAt ? `다음 복습: ${new Date(data.nextReviewAt).toLocaleString("ko-KR", { timeZone: data.daily.timezone })} (${data.daily.timezone})` : "현재 예정된 복습은 없어요."}</Copy>
        {data.due > 0 && <Copy>{data.daily.remaining ? "다음 학습은 복습할 단어부터 시작해요." : "남은 복습은 다음 학습 때 이어가세요. 더 공부하려면 하루 목표를 늘릴 수 있어요."}</Copy>}
      </View>
      {data.daily.remaining > 0 && <Button title="다음 학습 시작" busy={busy} onPress={onContinue} />}
      {data.daily.remaining === 0 && <Button secondary title="하루 목표 조정" onPress={() => router.push("/preferences")} />}
    </> : error ? <>
      <Copy error>{error}</Copy>
      <Copy>학습 완료 기록은 저장되어 있어요. 현황만 다시 불러올 수 있어요.</Copy>
      <Button secondary title="성과 다시 불러오기" onPress={() => setReload((n) => n + 1)} />
    </> : <Copy>오늘의 성과와 복습 일정을 불러오고 있어요.</Copy>}
    <Button title="오늘은 여기까지" onPress={() => router.replace("/account-ready")} />
    <Button secondary title="나의 학습과 복습 보기" onPress={() => router.push("/progress")} />
  </>;
}
