import { useCallback, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { View } from "react-native";
import type { ProgressOverview } from "@lingoloop/types";
import { useAuth } from "../services/auth-context";
import { authenticatedRequest } from "../services/session";
import { Screen, Heading, Copy, Button, styles } from "../components/auth-ui";
export default function Ready() {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProgressOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setData(null);
    setLoadError(null);
    if (auth.user) void authenticatedRequest<ProgressOverview>("/progress/overview")
      .then((result) => { if (active) setData(result); })
      .catch((e) => { if (active) setLoadError(e instanceof Error ? e.message : "학습 현황을 불러오지 못했어요."); });
    return () => { active = false; };
  }, [auth.user?.id, reload]));
  if (auth.loading || auth.error) return <Redirect href="/" />;
  if (!auth.user) return <Redirect href="/welcome" />;
  async function exit() {
    setBusy(true);
    setError(null);
    try { await auth.logout(); }
    catch (e) { setError(e instanceof Error ? e.message : "로그아웃에 실패했어요."); }
    finally { setBusy(false); }
  }
  const achieved = data?.daily.remaining === 0;
  return (
    <Screen>
      <Copy>LingoLoop / 오늘의 암기</Copy>
      <Heading>오늘도 기억을 쌓아요</Heading>
      {data ? <>
        <View style={styles.card}>
          <Copy>오늘 푼 문제</Copy>
          <Heading>{data.daily.answered} / {data.daily.goal}문제</Heading>
          <Copy>{achieved ? "오늘 목표를 달성했어요!" : `목표까지 ${data.daily.remaining}문제 남았어요.`}</Copy>
          <Copy>오답과 다시 풀기도 포함해요. {data.daily.timezone} 기준</Copy>
        </View>
        <Button title={data.hasActiveSession ? "이어서 암기하기" : achieved ? "오늘 학습 돌아보기" : data.due ? "복습부터 암기하기" : "오늘 암기 시작"}
          onPress={() => router.push(achieved && !data.hasActiveSession ? "/progress" : "/learn")} />
        {data.hasActiveSession && <Copy>진행 중인 학습이 있어요. 마지막 문제부터 이어서 풀 수 있어요.</Copy>}
        <View style={styles.card}>
          <Heading>{data.due ? `복습할 단어 ${data.due}개` : "지금 복습할 단어는 없어요"}</Heading>
          <Copy>{data.due ? achieved ? "복습할 단어가 남아 있어요. 더 공부하려면 하루 목표를 늘려 주세요." : "새 단어보다 복습할 단어를 먼저 준비해요." : data.learned ? "복습 시간이 되면 다시 안내할게요." : "첫 학습을 마치면 단어별 복습 일정이 생겨요."}</Copy>
          {data.nextReviewAt && <Copy>다음 복습: {new Date(data.nextReviewAt).toLocaleString("ko-KR", { timeZone: data.daily.timezone })} ({data.daily.timezone})</Copy>}
          <Copy>학습한 단어 {data.learned}개 / 완료한 학습 {data.completedSessions}회</Copy>
          <Button secondary title="나의 학습과 복습" onPress={() => router.push("/progress")} />
        </View>
        <Button secondary title="현황 새로고침" onPress={() => setReload((n) => n + 1)} />
      </> : loadError ? <>
        <Copy error>{loadError}</Copy>
        <Button title="현황 다시 불러오기" onPress={() => setReload((n) => n + 1)} />
        <Button secondary title="암기 화면으로" onPress={() => router.push("/learn")} />
      </> : <Copy>오늘의 학습 현황을 불러오고 있어요.</Copy>}
      <Button title="해리포터 단어 암기" onPress={() => router.push("/hp-cards")} />
      <Button secondary title="학습 목표 설정" onPress={() => router.push("/preferences")} />
      <Button secondary title="내 시작 수준 확인" onPress={() => router.push("/level-test")} />
      <Button secondary title="저장 없이 체험하기" onPress={() => router.push("/practice")} />
      <Copy>{auth.user.email}</Copy>
      {error && <Copy error>{error}</Copy>}
      <Button secondary title="로그아웃" busy={busy} onPress={() => void exit()} />
    </Screen>
  );
}
