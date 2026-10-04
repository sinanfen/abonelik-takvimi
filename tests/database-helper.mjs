import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

let sqlite;
export function resetDatabase(maxVersion = 5) {
  sqlite?.close();
  sqlite = new DatabaseSync(":memory:");
  const source = readFileSync(
    new URL("../src-tauri/src/lib.rs", import.meta.url),
    "utf8",
  );
  const migrations =
    /Migration\s*\{\s*version:\s*(\d+),[\s\S]*?sql:\s*(?:r#"([\s\S]*?)"#|"([^"]*)"|include_str!\("([^"]*)"\))/g;
  for (const match of source.matchAll(migrations)) {
    if (Number(match[1]) > maxVersion) continue;
    const sql =
      match[2] ??
      match[3] ??
      readFileSync(
        new URL(`../src-tauri/src/${match[4]}`, import.meta.url),
        "utf8",
      );
    sqlite.exec(sql);
  }
  return sqlite;
}
export async function getDatabase() {
  return {
    select: async (sql, params = []) => sqlite.prepare(sql).all(...params),
    execute: async (sql, params = []) => {
      const result = sqlite.prepare(sql).run(...params);
      return { rowsAffected: result.changes };
    },
  };
}
