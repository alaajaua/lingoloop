"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  ContentAudit,
  ContentStatus,
  ExampleInput,
  WordInput,
  WordList,
  WordRecord,
} from "@lingoloop/types";
import ContentImport from "./content-import";
import { AdminApi, errorMessage } from "../lib/api";
const labels: Record<ContentStatus, string> = {
  draft: "초안",
  review: "검토 중",
  published: "게시됨",
  archived: "보관됨",
};
const actions: Record<ContentStatus, string> = {
  draft: "초안으로 되돌리기",
  review: "검토 요청",
  published: "게시",
  archived: "보관",
};
const transitions: Record<ContentStatus, ContentStatus[]> = {
  draft: ["review", "archived"],
  review: ["draft", "published", "archived"],
  published: ["draft", "archived"],
  archived: ["draft"],
};
const blank = (): WordInput => ({
  lemma: "",
  displayWord: "",
  partOfSpeech: "",
  difficulty: 1,
  frequencyRank: null,
  tags: [],
  meanings: [],
});
const blankExample = (): ExampleInput => ({
  sentenceEn: "",
  sentenceKo: "",
  targetForm: "",
  explanation: "",
  audioUrl: "",
  difficulty: 1,
});
function inputOf(w: WordRecord): WordInput {
  return {
    lemma: w.lemma,
    displayWord: w.displayWord,
    partOfSpeech: w.partOfSpeech,
    difficulty: w.difficulty,
    frequencyRank: w.frequencyRank,
    tags: w.tags,
    meanings: w.meanings.map((m) => ({
      id: m.id,
      meaningKo: m.meaningKo,
      definitionEn: m.definitionEn ?? "",
      examples: m.examples.map((e) => ({
        id: e.id,
        sentenceEn: e.sentenceEn,
        sentenceKo: e.sentenceKo,
        targetForm: e.targetForm,
        explanation: e.explanation ?? "",
        audioUrl: e.audioUrl ?? "",
        difficulty: e.difficulty,
      })),
    })),
  };
}
export default function ContentManager() {
  const api = useRef(new AdminApi()).current;
  const lock = useRef(false);
  const [signed, setSigned] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState(""),
    [list, setList] = useState<WordList>({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  const [record, setRecord] = useState<WordRecord | null>(null),
    [draft, setDraft] = useState<WordInput | null>(null),
    [dirty, setDirty] = useState(false),
    [history, setHistory] = useState<ContentAudit[]>([]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function load(page = 1) {
    setList(
      await api.call<WordList>(
        `/admin/words?${new URLSearchParams({ q: query, ...(filter ? { status: filter } : {}), page: String(page) })}`,
      ),
    );
  }
  function change(value: WordInput) {
    setDraft(value);
    setDirty(true);
  }
  function mayLeave() {
    return !dirty || window.confirm("저장하지 않은 변경을 버릴까요?");
  }
  async function select(id: string) {
    if (!mayLeave()) return;
    await run(async () => {
      const w = await api.call<WordRecord>(`/admin/words/${id}`);
      const h = await api.call<ContentAudit[]>(`/admin/words/${id}/history`);
      setRecord(w);
      setDraft(inputOf(w));
      setHistory(h);
      setDirty(false);
    });
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    await run(async () => {
      const w = await api.call<WordRecord>(
        record ? `/admin/words/${record.id}` : "/admin/words",
        record ? "PATCH" : "POST",
        { ...draft, ...(record ? { revision: record.revision } : {}) },
      );
      setRecord(w);
      setDraft(inputOf(w));
      setDirty(false);
      setNotice("초안을 저장했어요.");
      await load();
      setHistory(await api.call(`/admin/words/${w.id}/history`));
    });
  }
  async function status(next: ContentStatus) {
    if (!record || dirty) return;
    if (
      next === "published" &&
      !window.confirm(
        "의미와 예문, 번역, 오디오를 직접 검토했나요? 게시 상태로 변경합니다.",
      )
    )
      return;
    await run(async () => {
      const w = await api.call<WordRecord>(
        `/admin/words/${record.id}/status`,
        "POST",
        { status: next, revision: record.revision },
      );
      setRecord(w);
      setDraft(inputOf(w));
      setNotice(`현재 상태: ${labels[next]}`);
      await load();
      setHistory(await api.call(`/admin/words/${w.id}/history`));
    });
  }
  if (!signed)
    return (
      <section className="panel login">
        <h2>관리자 로그인</h2>
        <p>권한이 부여된 이메일 계정으로 로그인하세요.</p>
        <p className="muted">
          현재 로컬 개발 환경입니다. 관리자 권한은 서버에서 별도로 부여합니다.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api.login(email, password);
              setSigned(true);
              setPassword("");
              await load();
            });
          }}
        >
          <label>
            이메일
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button disabled={busy} className="primary">
            {busy ? "확인 중…" : "로그인"}
          </button>
        </form>
      </section>
    );
  const readonly = !!record && record.status !== "draft";
  return (
    <>
      <div className="toolbar">
        <p>
          콘텐츠 작업 공간 <span className="muted">총 {list.total}개</span>
        </p>
        <button
          disabled={busy}
          onClick={() => {
            if (mayLeave())
              void run(async () => {
                try {
                  await api.logout();
                } finally {
                  setSigned(false);
                  setDraft(null);
                  setRecord(null);
                  setDirty(false);
                  setHistory([]);
                  setList({ items: [], total: 0, page: 1, pageSize: 20 });
                }
              });
          }}
        >
          로그아웃
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <ContentImport api={api} disabled={busy} onComplete={() => load()} />
      <div className="workspace">
        <aside className="panel">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => load());
            }}
          >
            <label>
              단어 또는 한국어 의미 검색
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={100}
              />
            </label>
            <label>
              상태
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">전체</option>
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={busy}>검색</button>
          </form>
          <button
            disabled={busy}
            onClick={() => {
              if (mayLeave()) {
                setRecord(null);
                setDraft(blank());
                setDirty(false);
                setHistory([]);
                setError("");
                setNotice("");
              }
            }}
          >
            새 단어 등록
          </button>
          <ul className="word-list">
            {list.items.map((w) => (
              <li key={w.id}>
                <button
                  disabled={busy}
                  aria-current={record?.id === w.id ? "true" : undefined}
                  onClick={() => void select(w.id)}
                >
                  <strong>{w.displayWord}</strong>
                  <span>
                    {labels[w.status]} / 난이도 {w.difficulty}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!list.items.length && (
            <p className="muted">조건에 맞는 단어가 없어요.</p>
          )}
          <div className="toolbar">
            <button
              disabled={busy || list.page <= 1}
              onClick={() => void run(() => load(list.page - 1))}
            >
              이전
            </button>
            <span>{list.page}쪽</span>
            <button
              disabled={busy || list.page * 20 >= list.total}
              onClick={() => void run(() => load(list.page + 1))}
            >
              다음
            </button>
          </div>
        </aside>
        <section className="panel editor">
          {!draft ? (
            <>
              <h2>학습 콘텐츠를 준비해요</h2>
              <p>단어를 선택하거나 새 초안을 등록하세요.</p>
              <p>초안 → 검토 → 게시 → 보관</p>
            </>
          ) : (
            <>
              <div className="toolbar">
                <h2>{record ? record.displayWord : "새 단어"}</h2>
                <span>
                  {record
                    ? `${labels[record.status]} / 버전 ${record.revision}`
                    : "초안"}
                </span>
              </div>
              {readonly && (
                <p>
                  수정하려면 먼저 초안으로 되돌려 주세요. 게시된 콘텐츠를
                  초안으로 바꾸면 학습 대상에서 제외됩니다.
                </p>
              )}
              {dirty && <p role="status">저장하지 않은 변경이 있어요.</p>}
              <form onSubmit={save}>
                <fieldset disabled={busy || readonly}>
                  <div className="grid">
                    {(["lemma", "displayWord", "partOfSpeech"] as const).map(
                      (key, i) => (
                        <label key={key}>
                          {["기본형", "표시 단어", "품사"][i]}
                          <input
                            required
                            maxLength={key === "partOfSpeech" ? 50 : 100}
                            value={draft[key]}
                            onChange={(e) =>
                              change({ ...draft, [key]: e.target.value })
                            }
                          />
                        </label>
                      ),
                    )}
                    <label>
                      난이도 (1~30)
                      <input
                        type="number"
                        min="1"
                        max="30"
                        step="0.1"
                        required
                        value={draft.difficulty}
                        onChange={(e) =>
                          change({
                            ...draft,
                            difficulty: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      빈도 순위 (선택)
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={draft.frequencyRank ?? ""}
                        onChange={(e) =>
                          change({
                            ...draft,
                            frequencyRank: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                      />
                    </label>
                    <label>
                      태그 (쉼표 구분)
                      <input
                        value={draft.tags.join(",")}
                        onChange={(e) =>
                          change({ ...draft, tags: e.target.value.split(",") })
                        }
                        onBlur={() =>
                          change({
                            ...draft,
                            tags: draft.tags
                              .map((t) => t.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </label>
                  </div>
                  {draft.meanings.map((m, mi) => (
                    <section className="meaning" key={mi}>
                      <div className="toolbar">
                        <h3>의미 {mi + 1}</h3>
                        <button
                          type="button"
                          onClick={() =>
                            change({
                              ...draft,
                              meanings: draft.meanings.filter(
                                (_, i) => i !== mi,
                              ),
                            })
                          }
                        >
                          의미 제거
                        </button>
                      </div>
                      <label>
                        한국어 의미
                        <textarea
                          required
                          maxLength={2000}
                          value={m.meaningKo}
                          onChange={(e) =>
                            change({
                              ...draft,
                              meanings: draft.meanings.map((x, i) =>
                                i === mi
                                  ? { ...x, meaningKo: e.target.value }
                                  : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        영문 정의 (선택)
                        <textarea
                          maxLength={2000}
                          value={m.definitionEn ?? ""}
                          onChange={(e) =>
                            change({
                              ...draft,
                              meanings: draft.meanings.map((x, i) =>
                                i === mi
                                  ? { ...x, definitionEn: e.target.value }
                                  : x,
                              ),
                            })
                          }
                        />
                      </label>
                      {m.examples.map((ex, ei) => (
                        <div className="example" key={ei}>
                          <h4>예문 {ei + 1}</h4>
                          {(
                            [
                              "sentenceEn",
                              "sentenceKo",
                              "targetForm",
                              "explanation",
                              "audioUrl",
                            ] as const
                          ).map((key, ki) => (
                            <label key={key}>
                              {
                                [
                                  "영어 문장",
                                  "한국어 번역",
                                  "정답 형태",
                                  "설명 (게시 시 필수)",
                                  "오디오 HTTPS URL 또는 /audio/ 파일 (게시 시 필수)",
                                ][ki]
                              }
                              <input
                                type="text"
                                required={ki < 3}
                                maxLength={2000}
                                value={ex[key] ?? ""}
                                onChange={(e) =>
                                  change({
                                    ...draft,
                                    meanings: draft.meanings.map((x, i) =>
                                      i === mi
                                        ? {
                                            ...x,
                                            examples: x.examples.map((v, j) =>
                                              j === ei
                                                ? {
                                                    ...v,
                                                    [key]: e.target.value,
                                                  }
                                                : v,
                                            ),
                                          }
                                        : x,
                                    ),
                                  })
                                }
                              />
                            </label>
                          ))}
                          <label>
                            예문 난이도
                            <input
                              type="number"
                              min="1"
                              max="30"
                              step="0.1"
                              required
                              value={ex.difficulty}
                              onChange={(e) =>
                                change({
                                  ...draft,
                                  meanings: draft.meanings.map((x, i) =>
                                    i === mi
                                      ? {
                                          ...x,
                                          examples: x.examples.map((v, j) =>
                                            j === ei
                                              ? {
                                                  ...v,
                                                  difficulty: Number(
                                                    e.target.value,
                                                  ),
                                                }
                                              : v,
                                          ),
                                        }
                                      : x,
                                  ),
                                })
                              }
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              change({
                                ...draft,
                                meanings: draft.meanings.map((x, i) =>
                                  i === mi
                                    ? {
                                        ...x,
                                        examples: x.examples.filter(
                                          (_, j) => j !== ei,
                                        ),
                                      }
                                    : x,
                                ),
                              })
                            }
                          >
                            예문 제거
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          change({
                            ...draft,
                            meanings: draft.meanings.map((x, i) =>
                              i === mi
                                ? {
                                    ...x,
                                    examples: [...x.examples, blankExample()],
                                  }
                                : x,
                            ),
                          })
                        }
                      >
                        예문 추가
                      </button>
                    </section>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      change({
                        ...draft,
                        meanings: [
                          ...draft.meanings,
                          { meaningKo: "", definitionEn: "", examples: [] },
                        ],
                      })
                    }
                  >
                    의미 추가
                  </button>
                  <button className="primary" type="submit">
                    {busy ? "저장 중…" : "초안 저장"}
                  </button>
                </fieldset>
              </form>
              {record && (
                <>
                  <div className="actions">
                    {transitions[record.status].map((next) => (
                      <button
                        disabled={busy || dirty}
                        key={next}
                        onClick={() => void status(next)}
                      >
                        {actions[next]}
                      </button>
                    ))}
                    <button
                      disabled={busy}
                      onClick={() => void select(record.id)}
                    >
                      최신 내용 불러오기
                    </button>
                  </div>
                  <h3>변경 이력</h3>
                  <ul>
                    {history.map((h) => (
                      <li key={h.id}>
                        v{h.revision}{" "}
                        {{
                          create: "등록",
                          edit: "수정",
                          status: "상태 변경",
                          import: "파일 등록",
                        }[h.action] ?? h.action}{" "}
                        → {labels[h.toStatus]} /{" "}
                        {new Date(h.createdAt).toLocaleString("ko-KR")} / 작업자{" "}
                        {h.actorId}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
