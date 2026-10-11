import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { LearningView } from "@lingoloop/types";
import { useAuth } from "../services/auth-context";
import { ApiError, authenticatedRequest } from "../services/session";
import { Screen, Heading, Copy, Button } from "../components/auth-ui";
import { LearningComplete } from "../components/learning-complete";

export default function LearningResult() {
  const auth = useAuth();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const id = typeof sessionId === "string" ? sessionId : null;
  const [session, setSession] = useState<LearningView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setSession(null);
    setError(null);
    if (auth.user && id) void authenticatedRequest<LearningView>(`/learning/sessions/${encodeURIComponent(id)}`)
      .then((result) => { if (active) setSession(result); })
      .catch((e) => { if (active) setError(e instanceof ApiError && e.status === 404 ? "이 계정에서 확인할 수 있는 학습 결과가 없어요." : e instanceof Error ? e.message : "결과를 불러오지 못했어요."); });
    return () => { active = false; };
  }, [auth.user?.id, id, reload]));
  return <Screen>
    <Copy>LingoLoop / 저장된 학습 결과</Copy>
    {auth.loading ? <Copy>계정을 확인하고 있어요.</Copy> : auth.error ? <>
      <Copy error>{auth.error}</Copy><Button title="계정 확인 다시 시도" onPress={() => void auth.retry()} />
    </> : !auth.user ? <>
      <Heading>로그인이 필요해요</Heading><Copy>로그인 후 학습 이력에서 결과를 다시 열어 주세요.</Copy>
      <Button title="로그인" onPress={() => router.push("/login")} />
    </> : !id ? <Copy error>학습 결과를 선택해 주세요.</Copy> : error ? <>
      <Copy error>{error}</Copy><Button title="결과 다시 불러오기" onPress={() => setReload((n) => n + 1)} />
    </> : !session ? <Copy>저장된 결과를 불러오고 있어요.</Copy> : session.completed ? <>
      <Copy>선택한 학습의 결과입니다. 아래 오늘의 성과와 복습 일정은 현재 기준이에요.</Copy>
      <LearningComplete key={session.id} session={session} busy={false} onContinue={() => router.replace("/learn")} />
    </> : <>
      <Heading>아직 진행 중인 학습이에요</Heading><Button title="이어서 암기하기" onPress={() => router.replace("/learn")} />
    </>}
    {!session?.completed && <Button secondary title="학습 이력으로" onPress={() => router.replace("/progress")} />}
  </Screen>;
}
