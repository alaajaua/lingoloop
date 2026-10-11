import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { View } from "react-native";
import type { LearningPreferences } from "@lingoloop/types";
import { useAuth } from "../services/auth-context";
import { authenticatedRequest } from "../services/session";
import { Screen, Heading, Copy, Button, styles } from "../components/auth-ui";
const goals = [
  ["career", "취업과 면접"],
  ["work", "회사와 업무"],
  ["travel", "여행"],
  ["exam", "시험 준비"],
  ["growth", "자기계발"],
] as const;
const levels = [
  [5, "쉬운 단어부터 익히고 싶어요"],
  [15, "일상 단어는 어느 정도 알아요"],
  [25, "다양한 글을 읽을 수 있어요"],
] as const;
export default function Preferences() {
  const auth = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [level, setLevel] = useState<number | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [reload, setReload] = useState(0);
  const lock = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setSaved(false);
      setLoaded(false);
      setError(null);
      if (!auth.user) return;
      void authenticatedRequest<LearningPreferences>("/learning/preferences")
        .then((p) => {
          if (active) {
            setSelected(p.learningGoals);
            setLevel(p.selfReportedLevel);
            setGoal(p.dailyGoal);
            setLoaded(true);
          }
        })
        .catch((e) => {
          if (active)
            setError(
              e instanceof Error ? e.message : "설정을 불러오지 못했어요.",
            );
        });
      return () => {
        active = false;
      };
    }, [auth.user?.id, reload]),
  );
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await authenticatedRequest("/learning/preferences", {
        learningGoals: selected,
        selfReportedLevel: level,
        dailyGoal: goal,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function changed() {
    setSaved(false);
    setError(null);
  }
  return (
    <Screen>
      <Heading>나에게 맞게 시작해요</Heading>
      {auth.loading ? (
        <Copy>계정을 확인하고 있어요.</Copy>
      ) : auth.error ? (
        <>
          <Copy error>{auth.error}</Copy>
          <Button
            title="계정 확인 다시 시도"
            onPress={() => void auth.retry()}
          />
        </>
      ) : !auth.user ? (
        <>
          <Copy>로그인하면 목표를 저장할 수 있어요.</Copy>
          <Button title="로그인" onPress={() => router.push("/login")} />
        </>
      ) : (
        <>
          {!loaded && !error && <Copy>기존 설정을 불러오고 있어요.</Copy>}
          {loaded && (
            <>
              <Copy>
                왜 영어 단어를 익히고 싶나요? 하나 이상 선택해 주세요.
              </Copy>
              <View style={{ gap: 8 }}>
                {goals.map(([key, label]) => (
                  <Button
                    key={key}
                    title={`${selected.includes(key) ? "선택됨: " : ""}${label}`}
                    secondary={!selected.includes(key)}
                    disabled={busy}
                    onPress={() => {
                      changed();
                      setSelected((items) =>
                        items.includes(key)
                          ? items.filter((x) => x !== key)
                          : [...items, key],
                      );
                    }}
                  />
                ))}
              </View>
              <Heading>지금 느끼는 수준</Heading>
              {levels.map(([key, label]) => (
                <Button
                  key={key}
                  title={`${level === key ? "선택됨: " : ""}${label}`}
                  secondary={level !== key}
                  disabled={busy}
                  onPress={() => {
                    changed();
                    setLevel(key);
                  }}
                />
              ))}
              <Copy>
                목표와 자기평가 수준은 저장합니다. 수준별 문제 추천은 이후
                연결할 예정이에요.
              </Copy>
              <Heading>하루에 얼마나 풀까요?</Heading>
              {[10, 20, 30, 50].map((n) => (
                <Button
                  key={n}
                  title={`${goal === n ? "선택됨: " : ""}하루 ${n}문제${n === 20 ? " (기본)" : ""}`}
                  secondary={goal !== n}
                  disabled={busy}
                  onPress={() => {
                    changed();
                    setGoal(n);
                  }}
                />
              ))}
              <View style={styles.card}>
                <Copy>
                  목표는 새 학습을 시작할 때 반영돼요. 진행 중인 학습은
                  유지합니다. 하루는 계정의 시간대 기준이며, 오답과 힌트를 쓴
                  풀이도 포함합니다. 재전송은 중복 계산하지 않아요.
                </Copy>
                <Copy>
                  현재 단어가 목표보다 적으면 준비된 만큼만 학습합니다.
                </Copy>
              </View>
              <Button
                title="설정 저장"
                busy={busy}
                disabled={!selected.length || level === null || goal === null}
                onPress={() => void save()}
              />
              {saved && (
                <>
                  <Copy>목표를 저장했어요.</Copy>
                  <Button
                    title="이 목표로 학습하기"
                    onPress={() => router.replace("/learn")}
                  />
                </>
              )}
            </>
          )}
          {error && (
            <>
              <Copy error>{error}</Copy>
              {!loaded && (
                <Button
                  title="설정 다시 불러오기"
                  onPress={() => setReload((n) => n + 1)}
                />
              )}
            </>
          )}
        </>
      )}
      <Button secondary title="내 시작 수준 확인" disabled={busy} onPress={() => router.push("/level-test")} />
      <Button
        secondary
        title="학습 현황으로"
        disabled={busy}
        onPress={() => router.replace("/progress")}
      />
    </Screen>
  );
}
