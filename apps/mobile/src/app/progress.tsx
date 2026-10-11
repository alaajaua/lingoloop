import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { View } from "react-native";
import type { ProgressOverview } from "@lingoloop/types";
import { authenticatedRequest } from "../services/session";
import { useAuth } from "../services/auth-context";
import { Screen, Heading, Copy, Button, styles } from "../components/auth-ui";
const date = (value: string) => new Date(value).toLocaleString("ko-KR");
export default function Progress() {
  const auth = useAuth();
  const [data, setData] = useState<ProgressOverview | null>(null);
  const [tab, setTab] = useState<"overview" | "vocabulary" | "history">(
    "overview",
  );
  const [filter, setFilter] = useState<"all" | "due" | "upcoming">("all");
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setData(null);
      setError(null);
      if (!auth.user) {
        setBusy(false);
        return () => {
          active = false;
        };
      }
      setBusy(true);
      void authenticatedRequest<ProgressOverview>(
        `/progress/overview?page=${page}&historyPage=${historyPage}&filter=${filter}`,
      )
        .then((result) => {
          if (active) setData(result);
        })
        .catch((e) => {
          if (active)
            setError(
              e instanceof Error ? e.message : "기록을 불러오지 못했어요.",
            );
        })
        .finally(() => {
          if (active) setBusy(false);
        });
      return () => {
        active = false;
      };
    }, [auth.user?.id, page, historyPage, filter, reload]),
  );
  return (
    <Screen>
      <Heading>나의 학습과 복습</Heading>
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
          <Copy>로그인하면 내 학습 기록을 확인할 수 있어요.</Copy>
          <Button title="로그인" onPress={() => router.push("/login")} />
        </>
      ) : (
        <>
          <Button
            title="바로 학습하기 / 이어하기"
            onPress={() => router.push("/learn")}
          />
          <Copy>
            {data
              ? `오늘 ${data.daily.answered} / ${data.daily.goal}문제 / 남은 목표 ${data.daily.remaining}문제 (${data.daily.timezone} 기준)`
              : ""}
          </Copy>
          <Button
            secondary
            title="학습 목표 설정"
            onPress={() => router.push("/preferences")}
          />
          <View style={{ gap: 8 }}>
            {(
              [
                ["overview", "한눈에 보기"],
                ["vocabulary", "단어별 복습"],
                ["history", "학습 이력"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                secondary={tab !== key}
                title={label}
                onPress={() => setTab(key)}
              />
            ))}
          </View>
          {busy ? (
            <Copy>기록을 불러오고 있어요.</Copy>
          ) : error ? (
            <>
              <Copy error>{error}</Copy>
              <Button
                title="다시 불러오기"
                onPress={() => setReload((n) => n + 1)}
              />
            </>
          ) : (
            data && (
              <>
                {tab === "overview" ? (
                  <>
                    <View style={styles.card}>
                      <Heading>
                        {data.due
                          ? `지금 복습할 단어 ${data.due}개`
                          : data.learned
                            ? "지금 복습할 단어는 없어요"
                            : "첫 단어부터 시작해요"}
                      </Heading>
                      <Copy>
                        학습한 단어 {data.learned}개 / 완료한 학습{" "}
                        {data.completedSessions}회
                      </Copy>
                      {data.nextReviewAt && (
                        <Copy>다음 복습: {date(data.nextReviewAt)}</Copy>
                      )}
                      {data.hasActiveSession && (
                        <Copy>진행 중인 학습이 있어요. 이어서 풀어보세요.</Copy>
                      )}
                    </View>
                    <Copy>
                      학습한 단어 수는 현재 게시된 단어 기준이며, 완전히
                      암기했다는 뜻은 아니에요. 저장 없이 체험한 결과는 포함하지
                      않습니다.
                    </Copy>
                  </>
                ) : tab === "vocabulary" ? (
                  <>
                    {(
                      [
                        ["all", "전체"],
                        ["due", "지금 복습"],
                        ["upcoming", "복습 예정"],
                      ] as const
                    ).map(([key, label]) => (
                      <Button
                        key={key}
                        secondary={filter !== key}
                        title={label}
                        disabled={busy}
                        onPress={() => {
                          setFilter(key);
                          setPage(1);
                        }}
                      />
                    ))}
                    <Copy>총 {data.vocabulary.total}개</Copy>
                    {!data.vocabulary.items.length && (
                      <Copy>
                        이 조건에 해당하는 단어가 없어요. 학습을 시작하면 복습
                        일정이 생깁니다.
                      </Copy>
                    )}
                    {data.vocabulary.items.map((w) => (
                      <View key={w.id} style={styles.card}>
                        <Heading>{w.word}</Heading>
                        <Copy>{w.meaning}</Copy>
                        <Copy>
                          {w.due ? "지금 복습할 수 있어요" : "복습 예정"} / 복습
                          단계 {w.stage + 1}
                        </Copy>
                        <Copy>{date(w.nextReviewAt)}</Copy>
                      </View>
                    ))}
                    <Copy>{page}쪽</Copy>
                    <Button
                      secondary
                      title="단어 이전 페이지"
                      disabled={page === 1}
                      onPress={() => setPage((p) => p - 1)}
                    />
                    <Button
                      secondary
                      title="단어 다음 페이지"
                      disabled={
                        page * data.vocabulary.pageSize >= data.vocabulary.total
                      }
                      onPress={() => setPage((p) => p + 1)}
                    />
                  </>
                ) : (
                  <>
                    <Copy>
                      반복 풀이를 포함한 답변 횟수입니다. 힌트 사용은
                      정답/오답과 중복될 수 있어요.
                    </Copy>
                    {!data.history.items.length && (
                      <Copy>
                        아직 학습 이력이 없어요. 첫 학습을 시작해 보세요.
                      </Copy>
                    )}
                    {data.history.items.map((s) => (
                      <View key={s.id} style={styles.card}>
                        <Copy>
                          {date(s.startedAt)} 시작 /{" "}
                          {s.completed ? "완료" : "진행 중"}
                        </Copy>
                        <Copy>
                          답변 {s.attempts}회 / 혼자 맞힘 {s.independentCorrect}
                          회 / 오답 {s.wrong}회 / 힌트 {s.hinted}회
                        </Copy>
                        <Copy>최근 활동: {date(s.lastActivityAt)}</Copy>
                        {s.completed && <Button secondary title="이 학습 결과 보기" onPress={() => router.push({ pathname: "/learning-result", params: { sessionId: s.id } })} />}
                      </View>
                    ))}
                    <Copy>{historyPage}쪽</Copy>
                    <Button
                      secondary
                      title="이력 이전 페이지"
                      disabled={historyPage === 1}
                      onPress={() => setHistoryPage((p) => p - 1)}
                    />
                    <Button
                      secondary
                      title="이력 다음 페이지"
                      disabled={
                        historyPage * data.history.pageSize >=
                        data.history.total
                      }
                      onPress={() => setHistoryPage((p) => p + 1)}
                    />
                  </>
                )}
                <Copy>{date(data.asOf)} 기준</Copy>
                <Button
                  secondary
                  title="현황 새로고침"
                  onPress={() => setReload((n) => n + 1)}
                />
              </>
            )
          )}
        </>
      )}
      <Button
        secondary
        title="학습 홈으로"
        onPress={() => router.replace("/account-ready")}
      />
    </Screen>
  );
}
