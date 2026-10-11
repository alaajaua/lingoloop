"use client";
import { useRef, useState } from "react";
import type { ImportPreview, ImportResult } from "@lingoloop/types";
import { AdminApi, ApiError, errorMessage } from "../lib/api";
const labels = {
  ready: "등록 가능",
  invalid: "입력 오류",
  duplicate: "파일 내 중복",
  existing: "기존 단어",
};
export default function ContentImport({
  api,
  onComplete,
  disabled,
}: {
  api: AdminApi;
  onComplete: () => Promise<void>;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<ImportPreview | null>(null),
    [result, setResult] = useState<ImportResult | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const payload = useRef<{ text: string; delimiter: "," | "\t" } | null>(null);
  const requestId = useRef("");
  const lock = useRef(false);
  async function validate() {
    if (!file || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setPreview(null);
    setResult(null);
    payload.current = null;
    try {
      if (file.size > 1024 * 1024)
        throw new Error("파일 크기는 1MB 이하여야 해요.");
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension !== "csv" && extension !== "tsv")
        throw new Error(
          "CSV 또는 TSV 파일을 선택해 주세요. 엑셀 파일은 UTF-8 CSV로 저장해 주세요.",
        );
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(
          await file.arrayBuffer(),
        );
      } catch {
        throw new Error(
          "UTF-8 파일이 아니에요. 엑셀에서 CSV UTF-8로 다시 저장해 주세요.",
        );
      }
      payload.current = { text, delimiter: extension === "tsv" ? "\t" : "," };
      const p = await api.call<ImportPreview>(
        "/admin/word-import/preview",
        "POST",
        payload.current,
      );
      setPreview(p);
      requestId.current = crypto.randomUUID();
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일을 읽지 못했어요.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function commit() {
    if (!preview || !payload.current || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = await api.call<ImportResult>(
        "/admin/word-import/commit",
        "POST",
        {
          ...payload.current,
          digest: preview.digest,
          requestId: requestId.current,
        },
      );
      setResult(saved);
      try {
        await onComplete();
      } catch {
        setError(
          "등록은 완료됐지만 목록 갱신에 실패했어요. 검색 버튼으로 목록을 다시 불러와 주세요.",
        );
      }
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError && e.status === 409) setPreview(null);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="panel bulk-import">
      <button
        type="button"
        disabled={busy || disabled}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        CSV / TSV 대량 등록
      </button>
      {open && (
        <>
          <h2>파일로 단어 등록</h2>
          <p>
            1행에 단어 1개, 의미 1개, 예문 최대 1개를 입력하세요. UTF-8 CSV/TSV,
            최대 500행과 1MB를 지원합니다.
          </p>
          <p>
            기존 단어는 변경하지 않습니다. 기본형과 품사가 같은 파일 내 중복
            행은 모두 제외하며, 정상 행만 초안으로 저장합니다. 추가 의미와
            예문은 등록 후 편집할 수 있어요.
          </p>
          <p>
            <a href="/templates/words.csv" download>
              CSV 템플릿 다운로드
            </a>{" "}
            /{" "}
            <a href="/templates/words-example.csv" download>
              작성 예시 다운로드
            </a>
          </p>
          <details>
            <summary>입력 항목 안내</summary>
            <p>
              필수: lemma(기본형), displayWord(표시 단어), partOfSpeech(품사),
              difficulty(1~30), meaningKo(한국어 의미).
            </p>
            <p>
              선택: definitionEn(영문 정의), frequencyRank(양의 정수), tags(세로
              막대 | 로 구분).
            </p>
            <p>
              예문을 입력한다면 sentenceEn, sentenceKo, targetForm,
              exampleDifficulty(1~30)를 함께 입력하세요. explanation과
              audioUrl(HTTPS 또는 등록된 /audio/ 파일)은 게시 전 채워야 합니다. 빈 숫자는 자동으로 채우지
              않습니다.
            </p>
          </details>
          <label>
            CSV 또는 TSV 파일
            <input
              type="file"
              accept=".csv,.tsv,text/csv,text/tab-separated-values"
              disabled={busy || disabled}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
                setResult(null);
                setError("");
                payload.current = null;
              }}
            />
          </label>
          <button
            disabled={!file || busy || disabled}
            onClick={() => void validate()}
          >
            {busy ? "처리 중…" : "파일 검증 및 미리보기"}
          </button>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {result ? (
            <p role="status">
              등록 완료: {result.created}개 초안 저장, {result.excluded}행 제외.
              기존 단어는 변경하지 않았습니다.
            </p>
          ) : (
            preview && (
              <>
                <p role="status">
                  총 {preview.total}행 / 등록 가능 {preview.ready}행 / 제외{" "}
                  {preview.excluded}행
                </p>
                <p>
                  아래 번호는 헤더를 1로 센 CSV 레코드 번호입니다. 상세 보기에서
                  실제 저장될 값을 확인하세요.
                </p>
                <div className="import-table">
                  <table>
                    <thead>
                      <tr>
                        <th>번호</th>
                        <th>기본형</th>
                        <th>검증 결과</th>
                        <th>안내 및 데이터</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => (
                        <tr key={row.row}>
                          <td>{row.row}</td>
                          <td>{row.lemma || "(비어 있음)"}</td>
                          <td>{labels[row.status]}</td>
                          <td>
                            {row.messages.map((m, i) => (
                              <p key={i}>{m}</p>
                            ))}
                            {row.data && (
                              <details>
                                <summary>저장 데이터 상세</summary>
                                <pre>{JSON.stringify(row.data, null, 2)}</pre>
                              </details>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  className="primary"
                  disabled={busy || disabled || preview.ready === 0}
                  onClick={() => void commit()}
                >
                  정상 {preview.ready}행을 초안으로 등록
                </button>
                <p className="muted">
                  서버 저장 중 오류가 나면 이번 등록 전체를 취소합니다. 응답이
                  끊겨도 같은 등록 버튼으로 재시도하면 중복 생성하지 않습니다.
                </p>
              </>
            )
          )}
        </>
      )}
    </section>
  );
}
