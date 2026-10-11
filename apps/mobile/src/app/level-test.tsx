import { useRef, useState } from "react";
import { router } from "expo-router";
import type {
  LevelTestView,
  LevelTestStart,
  LevelTestFeedback,
} from "@lingoloop/types";
import { useAuth } from "../services/auth-context";
import { authenticatedRequest } from "../services/session";
import { Screen, Heading, Copy, Button, Field } from "../components/auth-ui";
export default function LevelCheck() {
  const auth = useAuth();
  const [session, setSession] = useState<LevelTestView | null>(null);
  const [feedback, setFeedback] = useState<LevelTestFeedback | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);
  const lock = useRef(false);
  const pending = useRef<{
    position: number;
    answer: string;
    skip: boolean;
  } | null>(null);
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청에 실패했어요.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function start() {
    void run(async () => {
      const result = await authenticatedRequest<LevelTestStart>(
        "/level-test/sessions",
        {},
      );
      if ("unavailable" in result) {
        setUnavailable(result.available);
        return;
      }
      setUnavailable(null);
      setSession(result);
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
      const result = await authenticatedRequest<LevelTestFeedback>(
        `/level-test/sessions/${session.id}/answers`,
        pending.current,
      );
      setFeedback(result);
      pending.current = null;
      setRetrying(false);
    });
  }
  return (
    <Screen>
      <Copy>LingoLoop / 시작 수준 확인</Copy>
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
          <Heading>로그인하고 시작해요</Heading>
          <Button title="로그인" onPress={() => router.push("/login")} />
        </>
      ) : !session ? (
        <>
          <Heading>어디서부터 시작하면 좋을까요?</Heading>
          <Copy>
            20문제로 단어를 얼마나 떠올리는지 확인합니다. 정답에 따라 다음
            문제의 난이도가 바뀌고, 모르면 건너뛸 수 있어요.
          </Copy>
          <Copy>
            중간에 나가도 이어서 풀 수 있습니다. 이 결과는 앱의 임시 시작
            수준이며 공인 영어 등급이 아닙니다. 이미 배운 단어가 나올 수도
            있어요.
          </Copy>
          <Copy>
            레벨 확인은 하루 학습량과 복습 일정에 포함하지 않습니다. 완료 후
            새로 시작하는 학습부터 적용됩니다.
          </Copy>
          {unavailable !== null && (
            <Copy>
              현재 출제 가능한 단어가 {unavailable}개예요. 20개 이상 준비되면
              시작할 수 있어요.
            </Copy>
          )}
          <Button
            title="수준 확인 시작 / 이어하기"
            busy={busy}
            onPress={start}
          />
        </>
      ) : feedback ? (
        <>
          <Heading>
            {feedback.correct ? "정답이에요" : "이 단어를 확인해 보세요"}
          </Heading>
          <Copy>
            {feedback.answer} / {feedback.meaning}
          </Copy>
          <Button
            title={feedback.view.completed ? "내 결과 보기" : "다음 문제"}
            onPress={() => {
              setSession(feedback.view);
              setFeedback(null);
              setAnswer("");
            }}
          />
        </>
      ) : session.completed ? (
        <>
          <Heading>시작 수준을 확인했어요</Heading>
          <Copy>20문제 중 {session.correct}문제 정답</Copy>
          <Copy>임시 학습 수준 {session.estimate} / 30</Copy>
          <Copy>
            새 단어는 이 수준에 가까운 것부터 준비합니다. 복습할 단어는 계속
            우선하며, 현재 진행 중인 학습은 바뀌지 않아요. 콘텐츠 난이도와 수준
            추정은 아직 검증 중입니다.
          </Copy>
          <Button
            title="내 수준으로 학습하기"
            onPress={() => router.replace("/learn")}
          />
        </>
      ) : (
        <>
          <Copy>
            {session.cursor + 1} / {session.total}문제
          </Copy>
          <Heading>{session.question?.sentence}</Heading>
          <Copy>{session.question?.translation}</Copy>
          <Field
            key={`${session.id}-${session.cursor}`}
            label="레벨 확인 답 입력"
            value={answer}
            onChangeText={setAnswer}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy && !retrying}
            onSubmitEditing={() => {
              if (answer.trim() || retrying) submit();
            }}
          />
          <Button
            title={retrying ? "같은 답변 다시 전송" : "답 확인"}
            busy={busy}
            disabled={!retrying && !answer.trim()}
            onPress={() => submit()}
          />
          <Button
            secondary
            title="모르겠어요"
            disabled={busy || retrying}
            onPress={() => submit(true)}
          />
        </>
      )}
      {error && (
        <>
          <Copy error>{error}</Copy>
          <Button
            secondary
            title="저장된 문제 이어서 불러오기"
            busy={busy}
            onPress={start}
          />
        </>
      )}
      <Button
        secondary
        title="나중에 이어하기"
        disabled={busy}
        onPress={() => router.replace("/account-ready")}
      />
    </Screen>
  );
}
