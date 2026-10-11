import { WordPronunciation } from "../components/word-pronunciation";
import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import vocabulary from "../data/hp-vocabulary.json";
import { dueIds, isProgress, nextQueue, record, unseenIds, type Progress } from "../services/hp-progress";
import { Screen, Heading, Copy, Button, styles } from "../components/auth-ui";
const byId = new Map(vocabulary.map((w) => [w.id, w]));
const shortPos: Record<string, string> = {
  명사: "명", 동사: "동", 형용사: "형", 부사: "부", 대명사: "대", 고유명사: "고유명",
  전치사: "전", 감탄사: "감", 수사: "수", 조동사: "조동", 한정사: "한정",
  등위접속사: "접", 종속접속사: "접", 불변화사: "불변", "품사 확인 필요": "품사 미확인",
};
const compactPos = (pos: string) => pos.split(/\s*\/\s*/).map((part) => shortPos[part] ?? part).join("/");
const storageKey = "lingoloop.hp-cards.v1";
const progressKey = "lingoloop.hp-cards.progress.v1";
type Round = { dialogueOnly?: boolean; level?: string; kind?: string; queue: string[]; cursor: number; count: number; remembered: number; missed?: string[] };
function shuffle(ids: string[]) {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j]!, out[i]!]; }
  return out;
}
export default function HpCards() {
  const [level, setLevel] = useState("A2");
  const [kind, setKind] = useState("word");
  const [settings, setSettings] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dialogueOnly, setDialogueOnly] = useState(true);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [round, setRound] = useState<Round | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [revealed, setRevealed] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    if (Platform.OS === "web") try {
      const saved = localStorage.getItem(progressKey);
      if (saved) { const p: unknown = JSON.parse(saved); if (isProgress(p)) setProgress(p); }
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const r = JSON.parse(raw) as Round;
        if (Array.isArray(r.queue) && r.queue.length <= 10000 && r.queue.every((id) => byId.has(id)) && Number.isInteger(r.cursor) && r.cursor >= 0 && r.cursor <= r.queue.length && Number.isInteger(r.count) && r.count > 0 && r.count <= 10 && Number.isInteger(r.remembered) && r.remembered >= 0 && r.remembered <= r.count && (r.missed ?? []).every((id) => byId.has(id))) { setRound(r); setDialogueOnly(r.dialogueOnly ?? false); if (["전체","A1","A2","B1","B2","C1","C2","미분류"].includes(r.level ?? "")) setLevel(r.level!); if (["전체","word","phrase"].includes(r.kind ?? "")) setKind(r.kind!); }
      }
    } catch { setStorageError(true); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || Platform.OS !== "web") return;
    try {
      if (round) localStorage.setItem(storageKey, JSON.stringify(round)); else localStorage.removeItem(storageKey);
      localStorage.setItem(progressKey, JSON.stringify(progress));
    } catch { setStorageError(true); }
  }, [round, progress, ready]);
  const pool = vocabulary.filter((w) => (level === "전체" || w.level === level) && (kind === "전체" || w.type === kind) && (!dialogueOnly || w.examples.length > 0));
  const poolIds = pool.map((w) => w.id);
  const now = Date.now();
  const dueCount = dueIds(progress, poolIds, now).length;
  const unseenCount = unseenIds(progress, poolIds).length;
  const nextCount = Math.min(10, dueCount + unseenCount);
  const knownCount = poolIds.filter((id) => progress[id]?.known).length;
  const learningCount = poolIds.filter((id) => progress[id] && !progress[id].known).length;
  const nextDue = Math.min(...poolIds.map((id) => progress[id]).filter((p) => p && !p.known).map((p) => p!.due));
  function begin(queue: string[]) {
    setRound({ dialogueOnly, level, kind, queue, count: queue.length, cursor: 0, remembered: 0, missed: [] });
    setRevealed(false); setExamplesOpen(false); setPaused(false);
  }
  const start = () => begin(nextQueue(progress, poolIds, Date.now(), 10, shuffle));
  function grade(result: "known" | "remembered" | "forgot") {
    if (!round) return;
    const id = round.queue[round.cursor]!;
    const missed = round.missed ?? [];
    // A card forgotten earlier in this round stays scheduled for tomorrow even if remembered on retry.
    if (result === "forgot" || !missed.includes(id)) setProgress((p) => record(p, id, result, Date.now()));
    const forgot = result === "forgot";
    setRound({ ...round, queue: forgot ? [...round.queue, id] : round.queue, cursor: round.cursor + 1, remembered: round.remembered + Number(!forgot), missed: forgot && !missed.includes(id) ? [...missed, id] : missed });
    setRevealed(false); setExamplesOpen(false); setPaused(false);
  }
  function resetProgress() {
    if (Platform.OS === "web" && !window.confirm("이 기기에 저장된 해리포터 카드 학습 기록을 모두 지울까요?")) return;
    setProgress({}); setRound(null);
  }
  const card = round ? byId.get(round.queue[round.cursor] ?? "") : null;
  const movieNames: Record<string, string> = { HP01:"마법사의 돌", HP02:"비밀의 방", HP03:"아즈카반의 죄수", HP04:"불의 잔", HP05:"불사조 기사단", HP06:"혼혈 왕자", HP07:"죽음의 성물 1", HP08:"죽음의 성물 2" };
  return <Screen>
    <Text style={{ color: "#536585", fontSize: 14, fontWeight: "700", letterSpacing: 1 }}>LingoLoop / HARRY POTTER</Text>
    {!ready ? <Copy>카드를 준비하고 있어요.</Copy> : !round || paused ? <>
      <Heading>대사 속 단어를
내 단어로</Heading>
      <Copy>10개씩 가볍게. 뜻을 떠올리고, 해리포터 대사에서 다시 만나 보세요.</Copy>
      {paused && round && <Button title={`이어서 암기하기 (${round.remembered}/${round.count})`} onPress={() => setPaused(false)} />}
      <View style={[styles.card, { backgroundColor: "#F1F4FC" }]}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#253656" }}>{level === "A2" ? "기초 A2" : level} / {kind === "word" ? "단어" : kind === "phrase" ? "구문" : "단어와 구문"}</Text>
        <Copy>{dialogueOnly ? "대사가 있는 어휘" : "모든 어휘"} {pool.length.toLocaleString("ko-KR")}개 · 새 단어 {unseenCount.toLocaleString("ko-KR")}개 남음</Copy>
        {(learningCount > 0 || knownCount > 0) && <Copy>외우는 중 {learningCount}개 · 아는 단어 {knownCount}개{dueCount > 0 ? ` · 오늘 복습 ${dueCount}개` : ""}</Copy>}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: settings }} onPress={() => setSettings(!settings)}><Text style={{color:"#304DB6", paddingVertical:10,fontWeight:"600"}}>{settings ? "설정 접기 −" : "학습 범위 바꾸기 +"}</Text></Pressable>
        {settings && <>
          <Copy>난이도</Copy>
          <View style={{flexDirection:"row", flexWrap:"wrap", gap:8}}>{["전체","A1","A2","B1","B2","C1","C2","미분류"].map((v) => <Chip key={v} label={v} selected={level === v} onPress={() => setLevel(v)} />)}</View>
          <View style={{flexDirection:"row", flexWrap:"wrap", gap:8}}>{[["전체","모두"],["word","단어"],["phrase","구문"]].map(([v,label]) => <Chip key={v} label={label!} selected={kind === v} onPress={() => setKind(v!)} />)}</View>
          <Chip label="대사가 있는 어휘만" selected={dialogueOnly} onPress={() => setDialogueOnly(!dialogueOnly)} />
          <Copy>난이도와 뜻은 원본 자료 기준이며 검토 중입니다.</Copy>
          {Object.keys(progress).length > 0 && <Pressable accessibilityRole="button" onPress={resetProgress}><Text style={{color:"#9A3B3B",paddingVertical:10}}>학습 기록 지우기</Text></Pressable>}
        </>}
      </View>
      {nextCount > 0 ? <Button title={paused ? "새 카드로 시작 (현재 회차 종료)" : dueCount > 0 ? `복습 ${Math.min(dueCount, 10)}개${nextCount > dueCount ? ` + 새 단어 ${nextCount - Math.min(dueCount, 10)}개` : ""} 시작` : `${nextCount}개 암기 시작`} onPress={start} />
        : <Copy>{pool.length ? `이 범위는 오늘 할 카드를 모두 마쳤어요.${Number.isFinite(nextDue) ? ` 다음 복습은 ${formatDue(nextDue)}이에요.` : ""} 다른 난이도를 골라 보세요.` : "이 범위에 해당하는 카드가 없어요."}</Copy>}
      <Copy>단어 떠올리기 → 뜻 확인 → 어려운 단어는 다음 날 다시</Copy>
      <Copy>진행은 이 기기의 브라우저에 저장돼요. 계정의 하루 목표와 복습 일정에는 합산하지 않아요.</Copy>
      {process.env.EXPO_PUBLIC_HP_STANDALONE !== "1" && <Button secondary title="앱 홈으로" onPress={() => router.replace("/")} />}
    </> : card ? <>
      <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between"}}>
        <Copy>기억한 단어 {round.remembered} / {round.count}</Copy>
        <Pressable accessibilityRole="button" onPress={() => setPaused(true)}><Text style={{color:"#536585",padding:12}}>잠시 쉬기</Text></Pressable>
      </View>
      <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:round.count,now:round.remembered}} style={{height:5,backgroundColor:"#E7ECF5",borderRadius:3}}><View style={{height:5,width:`${round.remembered / round.count * 100}%`,backgroundColor:"#526ADA",borderRadius:3}} /></View>
      <View style={[styles.card, {backgroundColor:"#F5F7FC",paddingVertical:28}]}>
        <Text accessibilityLabel={`${card.pos}, ${card.level}`} style={{fontSize:13,color:"#62708A"}}>{compactPos(card.pos)}  {card.level}</Text>
        <Heading>{card.word}</Heading>
        {card.surface !== card.word && <Text style={{color:"#62708A",fontSize:14}}>원문에서는 {card.surface}</Text>}
        <WordPronunciation key={card.id} word={card.word} />
        {revealed ? <>
          <View style={{height:1,backgroundColor:"#DFE5EF",marginVertical:8}} />
          <Text style={{fontSize:23,lineHeight:33,fontWeight:"700",color:"#253656"}}>{card.meaning}</Text>
          {!!card.alternative && <Text style={{fontSize:14,lineHeight:21,color:"#62708A"}}>{card.alternative}</Text>}
          {!!card.note && <Text style={{fontSize:13,lineHeight:20,color:"#69758A"}}>{card.note}</Text>}
          {!card.reviewed && <Text style={{fontSize:12,color:"#69758A"}}>원본 뜻 / 정확성 검토 중</Text>}
        </> : <Copy>어떤 뜻인지 떠올려 보세요.</Copy>}
      </View>
      {!revealed ? <>
        <Button title="뜻 확인하기" onPress={() => setRevealed(true)} />
        <Button secondary title="이미 아는 단어예요" onPress={() => grade("known")} />
      </> : <>
        <View style={{flexDirection:"row",gap:10}}>
          <View style={{flex:1}}><Button secondary title="다시 연습" onPress={() => grade("forgot")} /></View>
          <View style={{flex:1}}><Button title="기억했어요" onPress={() => grade("remembered")} /></View>
        </View>
        <View style={{gap:16}}>
          <Pressable accessibilityRole="button" accessibilityState={{expanded:examplesOpen}} onPress={() => setExamplesOpen(!examplesOpen)}><Text style={{fontSize:17,fontWeight:"700",color:"#253656",paddingVertical:12}}>대사로 기억하기 {card.examples.length ? `(${card.examples.length})` : ""} {examplesOpen ? "−" : "+"}</Text></Pressable>
          {examplesOpen && (card.examples.length ? <>
            {card.examples.map((e) => <View key={e.sentenceId} style={{borderLeftWidth:3,borderLeftColor:"#BBC8F1",paddingLeft:16,gap:8}}>
              <Text style={{fontSize:17,lineHeight:27,color:"#253656"}}>{highlight(e.text,e.surface)}</Text>
              {(e as {ko?: string}).ko ? <Text style={{fontSize:15,lineHeight:23,color:"#4A5670"}}>{(e as {ko?: string}).ko}</Text> : null}
              <Text style={{fontSize:12,lineHeight:19,color:"#69758A"}}>{movieNames[e.movie] ?? e.movie} / {e.speaker} / 대본 {e.page}쪽</Text>
            </View>)}
            <Text style={{fontSize:12,lineHeight:19,color:"#69758A"}}>제공된 대본에서 자동 선별한 대사입니다. 영화의 최종 대사와 다를 수 있으며, 예문의 뜻은 문맥에 따라 달라질 수 있어요.</Text>
          </> : <Copy>읽기 좋은 대사를 아직 찾지 못했어요. 확인되지 않은 문장은 넣지 않았습니다.</Copy>)}
        </View>
      </>}
    </> : <>
      <Heading>{round.count}개, 잘 마쳤어요</Heading>
      {(round.missed ?? []).length ? <>
        <Copy>헷갈렸던 단어 {round.missed!.length}개는 내일 다시 보여 드릴게요.</Copy>
        <View style={[styles.card, {gap:10}]}>{round.missed!.map((id) => { const w = byId.get(id)!; return <View key={id} style={{flexDirection:"row",gap:12,alignItems:"baseline"}}>
          <Text style={{fontSize:17,fontWeight:"700",color:"#253656",minWidth:90}}>{w.word}</Text>
          <Text style={{flex:1,fontSize:15,lineHeight:22,color:"#34415D"}}>{w.meaning}</Text>
        </View>; })}</View>
        <Button secondary title={`헷갈린 단어 ${round.missed!.length}개 한 번 더`} onPress={() => begin(shuffle(round.missed!))} />
      </> : <Copy>한 번에 모두 기억했어요. 기억한 단어는 며칠 뒤 복습으로 다시 만나요.</Copy>}
      {nextCount > 0 ? <Button title={`다음 ${nextCount}개 암기`} onPress={start} /> : <Copy>이 범위는 오늘 할 카드를 모두 마쳤어요.</Copy>}
      <Button secondary title="학습 범위 바꾸기" onPress={() => { setRound(null); setSettings(true); }} />
      <Copy>이 체험 결과는 계정의 하루 목표와 복습 일정에는 합산하지 않습니다.</Copy>
    </>}
    {storageError && <Copy error>진행을 저장하지 못했어요. 새로고침하면 이번 회차가 사라질 수 있어요.</Copy>}
  </Screen>;
}
function formatDue(due: number) {
  const days = Math.ceil((due - Date.now()) / (24 * 60 * 60 * 1000));
  return days <= 1 ? "내일" : `${days}일 뒤`;
}
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={{minHeight:44,paddingHorizontal:16,justifyContent:"center",borderRadius:22,backgroundColor:selected ? "#304DB6" : "#E6EBF5"}}><Text style={{color:selected ? "white" : "#34415D",fontWeight:"600"}}>{label}</Text></Pressable>;
}
function highlight(text: string, surface: string) {
  const index = text.toLowerCase().indexOf(surface.toLowerCase());
  if (index < 0) return text;
  return <>{text.slice(0,index)}<Text style={{fontWeight:"800",color:"#304DB6",backgroundColor:"#E8EEFF"}}>{text.slice(index,index+surface.length)}</Text>{text.slice(index+surface.length)}</>;
}
