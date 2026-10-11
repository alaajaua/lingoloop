import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseImport } from "../apps/api/src/content/import-parser";
const header = "lemma,displayWord,partOfSpeech,difficulty,meaningKo";
test("CSV accepts UTF-8 BOM, quoted commas/newlines, escaped quotes, TSV and bundled example", () => {
  const csv =
    "\ufeff" + header + '\r\nmeet,meet,verb,5,"만나다,\n""접하다"""\r\n';
  assert.equal(
    parseImport(csv, ",")[0]?.data?.meanings[0]?.meaningKo,
    '만나다,\n"접하다"',
  );
  assert.equal(
    parseImport(
      header.replaceAll(",", "\t") + "\ncat\tcat\tnoun\t2\t고양이",
      "\t",
    )[0]?.status,
    "ready",
  );
  const examples = parseImport(
    readFileSync("apps/admin/public/templates/words-example.csv", "utf8"),
    ",",
  );
  assert.equal(examples.length, 2);
  assert.ok(examples.every((r) => r.status === "ready"));
});
test("CSV rejects malformed files and marks bad fields and all duplicate rows without defaults", () => {
  assert.throws(() => parseImport(header + '\n"unfinished', ","));
  assert.throws(() =>
    parseImport(header + ",lemma\ncat,cat,noun,2,고양이,cat", ","),
  );
  assert.throws(() =>
    parseImport(header + ",unexpected\ncat,cat,noun,2,고양이,x", ","),
  );
  assert.throws(() => parseImport(header, ","));
  assert.throws(() => parseImport("x".repeat(1024 * 1024 + 1), ","));
  assert.throws(() =>
    parseImport(
      header +
        "\n" +
        Array.from({ length: 501 }, (_, i) => `cat${i},cat,noun,2,고양이`).join(
          "\n",
        ),
      ",",
    ),
  );
  const rows = parseImport(
    header + "\ncat,cat,noun,,고양이\nDOG,dog,noun,2,개\ndog,dog,NOUN,3,개",
    ",",
  );
  assert.equal(rows[0]?.status, "invalid");
  assert.ok(rows.slice(1).every((r) => r.status === "duplicate"));
  const missingExample = parseImport(
    header + ",sentenceEn\nmeet,meet,verb,5,만나다,I met him.",
    ",",
  );
  assert.equal(missingExample[0]?.status, "invalid");
});
