import { LearningComplete } from "../components/learning-complete";
import { ExampleAudio } from "../components/example-audio";
import { useRef, useState } from "react";
import { router } from "expo-router";
import { View, Text } from "react-native";
import type {
  LearningView,
  LearningFeedback,
  LearningStart,
} from "@lingoloop/types";
import { useAuth } from "../services/auth-context";
import { authenticatedRequest } from "../services/session";
import {
  Screen,
  Heading,
  Copy,
  Button,
  Field,
  styles,
} from "../components/auth-ui";
export default function Learn() {
  const auth = useAuth();
  const [session, setSession] = useState<LearningView | null>(null);
  const [empty, setEmpty] = useState<{
    nextReviewAt: string | null;
    reason?: "goal";
  } | null>(null);
  const [feedback, setFeedback] = useState<LearningFeedback | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  // Preserve exactly the submitted payload on network failure for safe retries.
  const pending = useRef<{
    position: number;
    answer: string;
    skip: boolean;
  } | null>(null);
  const [retrying, setRetrying] = useState(false);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청을 처리하지 못했어요.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function resume() {
    void run(async () => {
      const result = await authenticatedRequest<LearningStart>(
        "/learning/sessions",
        {},
      );
      setEmpty("empty" in result ? result : null);
      setSession("empty" in result ? null : result);
      setFeedback(null);
      setAnswer("");
      pending.current = null;
      setRetrying(false);
    });
  }
  function submit(skip = false) {
    if (!session) return;
    void run(async () => {
      if (!pending.current)
        pending.current = { position: session.cursor, answer, skip };
      setRetrying(true);
      const result = await authenticatedRequest<LearningFeedback>(
        `/learning/sessions/${session.id}/answers`,
        pending.current,
      );
      setFeedback(result);
      pending.current = null;
      setRetrying(false);
    });
  }
  return (
    <Screen>
      <Copy>LingoLoop / 기록이 남는 암기</Copy>
      {auth.loading ? (
        <Copy>로그인 상태를 확인하고 있어요.</Copy>
      ) : !auth.user ? (
        <>
          <Heading>로그인하고 이어가세요</Heading>
          <Copy>답변과 힌트 사용 기록을 계정에 저장합니다.</Copy>
          <Button title="로그인" onPress={() => router.push("/login")} />
        </>
      ) : empty ? (
        <>
          <Heading>
            {empty.reason === "goal"
              ? "오늘 목표를 달성했어요!"
              : empty.nextReviewAt
                ? "오늘의 학습을 마쳤어요"
                : "학습할 단어를 준비 중이에요"}
          </Heading>
          <Copy>
            {empty.reason === "goal"
              ? "오늘의 학습량을 채웠어요. 내일 이어서 학습하거나 하루 목표를 조정할 수 있어요."
              : empty.nextReviewAt
                ? `다음 복습: ${new Date(empty.nextReviewAt).toLocaleString("ko-KR")}`
                : "게시된 단어와 예문이 준비되면 여기서 시작할 수 있어요. 초안은 학습에 나오지 않습니다."}
          </Copy>
          <Button
            secondary
            title="학습 목표 설정"
            onPress={() => router.push("/preferences")}
          />
          <Button title="다시 확인" busy={busy} onPress={resume} />
          <Button
            secondary
            title="예시 단어로 체험하기"
            onPress={() => router.push("/practice")}
          />
        </>
      ) : !session ? (
        <>
          <Heading>오늘은 어떤 단어를 기억하나요?</Heading>
          <Copy>
            바로 문제를 풀고 모르는 단어만 다시 연습해요. 답변과 힌트 사용을
            계정에 저장합니다.
          </Copy>
          <Copy>
            게시된 단어 중 복습할 단어를 먼저 준비합니다. 한 번에 최대 5개를
            학습해요.
          </Copy>
          <Button title="학습 시작 / 이어하기" busy={busy} onPress={resume} />
        </>
      ) : feedback ? (
        <View style={{ gap: 16 }}>
          <Heading>
            {feedback.correct
              ? feedback.hintUsed
                ? "힌트로 떠올렸어요"
                : "잘 기억했어요!"
              : "다시 익혀볼까요?"}
          </Heading>
          <Copy>
            정답: {feedback.answer} / {feedback.meaning}
          </Copy>
          <Copy>{feedback.full}</Copy>
          <Copy>{feedback.note}</Copy>
          {feedback.audioUrl && (
            <ExampleAudio key={feedback.audioUrl} url={feedback.audioUrl} />
          )}
          {(!feedback.correct || feedback.hintUsed) && (
            <Copy>이 단어는 뒤에서 다시 나와요.</Copy>
          )}
          <Copy>답변 기록이 저장됐어요.</Copy>
          <Button
            title={feedback.view.completed ? "학습 결과 보기" : "다음 문제"}
            onPress={() => {
              if (feedback.view.completed) {
                router.replace({ pathname: "/learning-result", params: { sessionId: feedback.view.id } });
                return;
              }
              setSession(feedback.view);
              setFeedback(null);
              setAnswer("");
            }}
          />
        </View>
      ) : session.completed ? (
        <LearningComplete key={session.id} session={session} busy={busy} onContinue={resume} />
      ) : (
        <>
          <Copy>
            혼자 떠올린 단어 {session.remembered} / {session.wordCount}개 / 남은
            문제 {session.total - session.cursor}개
          </Copy>
          <Heading>빈칸의 단어를 떠올려 보세요</Heading>
          <View style={styles.card}>
            <Text style={{ fontSize: 24, lineHeight: 34 }}>
              {session.question?.sentence}
            </Text>
            <Copy>{session.question?.translation}</Copy>
          </View>
          <Field
            key={`${session.id}-${session.cursor}`}
            label="영어 답 입력"
            value={answer}
            onChangeText={setAnswer}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            editable={!busy && !retrying}
            onSubmitEditing={() => {
              if (answer.trim() || retrying) submit();
            }}
          />
          {session.question?.hint && <Copy>{session.question.hint}</Copy>}
          <Button
            title={retrying ? "같은 답변 다시 전송" : "정답 확인"}
            busy={busy}
            disabled={!retrying && !answer.trim()}
            onPress={() => submit()}
          />
          <Button
            secondary
            title="첫 글자 힌트"
            disabled={busy || retrying || !!session.question?.hint}
            onPress={() =>
              void run(async () =>
                setSession(
                  await authenticatedRequest<LearningView>(
                    `/learning/sessions/${session.id}/hint`,
                    { position: session.cursor },
                  ),
                ),
              )
            }
          />
          <Button
            secondary
            title="잘 모르겠어요"
            disabled={busy || retrying}
            onPress={() => submit(true)}
          />
        </>
      )}
      {error && (
        <>
          <Copy error>{error}</Copy>
          {auth.user && (
            <Button
              secondary
              title="서버 기록에서 이어서 불러오기"
              busy={busy}
              onPress={resume}
            />
          )}
        </>
      )}
      {auth.user && !session?.completed && (
        <Button
          secondary
          title="나중에 이어하기"
          disabled={busy}
          onPress={() => router.replace("/account-ready")}
        />
      )}
    </Screen>
  );
}
