import { router } from "expo-router";
import { useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { matchesPracticeAnswer, practiceRetryQueue } from "@lingoloop/learning-engine";
import { Screen, Heading, Copy, Button, Field, styles } from "../components/auth-ui";

const words = [
  { word: "apple", meaning: "사과", sentence: "I eat an _____.", full: "I eat an apple.", translation: "나는 사과 하나를 먹는다.", answer: "apple", note: "apple은 사과라는 뜻이에요." },
  { word: "book", meaning: "책", sentence: "This _____ is interesting.", full: "This book is interesting.", translation: "이 책은 재미있다.", answer: "book", note: "book은 책이라는 뜻이에요." },
  { word: "meet", meaning: "만나다", sentence: "I _____ her yesterday.", full: "I met her yesterday.", translation: "나는 어제 그녀를 만났다.", answer: "met", note: "meet의 과거형은 met이에요. yesterday에 주목하세요." },
  { word: "happy", meaning: "행복한", sentence: "She is _____ today.", full: "She is happy today.", translation: "그녀는 오늘 행복하다.", answer: "happy", note: "happy는 행복한 상태를 나타내요." },
  { word: "learn", meaning: "배우다", sentence: "We _____ English every day.", full: "We learn English every day.", translation: "우리는 매일 영어를 배운다.", answer: "learn", note: "learn은 배우다라는 뜻이에요." },
];
export default function Practice() {
  const [phase, setPhase] = useState<"intro" | "study" | "quiz" | "done">("intro");
  const [queue, setQueue] = useState([0, 1, 2, 3, 4]);
  const [position, setPosition] = useState(0);
  const [round, setRound] = useState(1);
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState(false);
  const [feedback, setFeedback] = useState<null | boolean>(null);
  const [failed, setFailed] = useState<number[]>([]);
  const [helped, setHelped] = useState<number[]>([]);
  const [remembered, setRemembered] = useState<number[]>([]);
  const lock = useRef(false);
  const id = queue[position];
  const word = words[id];
  const retry = practiceRetryQueue(failed, helped);
  function clearQuestion() { setAnswer(""); setHint(false); setFeedback(null); lock.current = false; }
  function submit(skip = false) {
    if (lock.current || (!skip && !answer.trim())) return;
    lock.current = true;
    const correct = !skip && matchesPracticeAnswer(answer, word.answer);
    setFeedback(correct);
    if (!correct) setFailed(items => [...items, id]);
    else if (hint) setHelped(items => [...items, id]);
    else setRemembered(items => [...new Set([...items, id])]);
  }
  function next() {
    clearQuestion();
    if (position + 1 === queue.length) setPhase("done");
    else setPosition(position + 1);
  }
  function startReview() {
    setQueue(retry); setPosition(0); setFailed([]); setHelped([]);
    setRound(round + 1); clearQuestion(); setPhase("quiz");
  }
  function restart() {
    setQueue([0, 1, 2, 3, 4]); setPosition(0); setRound(1);
    setFailed([]); setHelped([]); setRemembered([]); clearQuestion(); setPhase("intro");
  }
  return <Screen>
    <Copy>LingoLoop / 단어 암기 체험</Copy>
    {phase === "intro" ? <>
      <Heading>어떤 단어를 기억하고 있나요?</Heading>
      <Copy>바로 문제를 풀어보세요. 이미 아는 단어는 통과하고, 모르거나 힌트가 필요했던 단어만 다시 연습해요.</Copy>
      <View style={styles.card}><Copy>바로 풀기 → 모르는 단어 확인 → 다시 기억하기</Copy></View>
      <Copy>예시 데이터로 진행하는 체험입니다. 결과는 저장되지 않고 새로고침하면 초기화돼요.</Copy>
      <Button secondary title="로그인하고 학습 기록 남기기" onPress={() => router.push("/learn")} />
      <Button title="바로 문제 풀기" onPress={() => setPhase("quiz")} />
      <Button secondary title="단어를 먼저 익힐래요" onPress={() => setPhase("study")} />
    </> : phase === "study" ? <>
      <Copy>먼저 익히기 {position + 1} / {queue.length}</Copy>
      <View style={styles.card}>
        <Heading>{word.word}</Heading><Copy>{word.meaning}</Copy>
        <Text style={local.sentence}>{word.full}</Text><Copy>{word.translation}</Copy><Copy>{word.note}</Copy>
      </View>
      <Copy>단어와 뜻을 연결해 기억해 보세요. 다음에는 단어를 가리고 물어볼게요.</Copy>
      <Button title={position + 1 === queue.length ? "이제 기억해 보기" : "다음 단어 익히기"} onPress={() => {
        if (position + 1 === queue.length) { setPosition(0); setPhase("quiz"); }
        else setPosition(position + 1);
      }} />
    </> : phase === "quiz" ? <>
      <Copy>{round === 1 ? "기억해 보기" : `다시 기억하기 ${round - 1}회차`} / {position + 1} / {queue.length}</Copy>
      <Heading>빈칸의 단어를 떠올려 보세요</Heading>
      <View style={styles.card}><Text style={local.sentence}>{word.sentence}</Text><Copy>{word.translation}</Copy></View>
      <Field key={`${round}-${position}`} label="영어 답 입력" value={answer} onChangeText={setAnswer} autoCapitalize="none" autoCorrect={false} autoFocus editable={feedback === null} onSubmitEditing={() => submit()} returnKeyType="done" />
      {feedback === null ? <>
        {hint && <Copy>첫 글자는 {word.answer[0]}, 총 {word.answer.length}글자예요.</Copy>}
        <Button title="정답 확인" disabled={!answer.trim()} onPress={() => submit()} />
        <Button secondary title={hint ? "힌트 확인 중" : "첫 글자 힌트"} disabled={hint} onPress={() => setHint(true)} />
        <Button secondary title="잘 모르겠어요" onPress={() => submit(true)} />
      </> : <View accessibilityLiveRegion="polite" style={{gap:16}}>
        <Heading>{feedback ? (hint ? "힌트로 떠올렸어요" : "잘 기억했어요!") : "다시 익혀볼까요?"}</Heading>
        <Copy>정답: {word.answer} / {word.meaning}</Copy><Copy>{word.full}</Copy><Copy>{word.note}</Copy>
        {(!feedback || hint) && <Copy>이번 회차가 끝나면 다시 연습할 수 있어요.</Copy>}
        <Button title={position + 1 === queue.length ? "결과 보기" : "다음 단어"} onPress={next} />
      </View>}
    </> : <>
      <Heading>{retry.length ? "한 번 더 떠올려볼까요?" : "5개 모두 스스로 떠올렸어요!"}</Heading>
      <Copy>도움 없이 떠올린 단어 {remembered.length} / 5개</Copy>
      {retry.length > 0 && <Copy>다시 연습할 단어: {retry.map(i => words[i].word).join(", ")}</Copy>}
      <Copy>지금 떠올렸다고 오래 기억하는 것은 아니에요. 시간이 지난 뒤 다시 확인하는 복습은 이후 연결할 예정입니다.</Copy>
      {retry.length > 0 && <Button title={`어려웠던 ${retry.length}개 다시 연습`} onPress={startReview} />}
      <Button secondary title="처음부터 다시 체험" onPress={restart} />
    </>}
  </Screen>;
}
const local = StyleSheet.create({sentence:{fontSize:24,lineHeight:34,fontWeight:"600",color:"#17352b"}});
