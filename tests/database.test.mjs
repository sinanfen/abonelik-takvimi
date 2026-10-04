import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { mockLoad } from "./sql-plugin-mock.mjs";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@tauri-apps/plugin-sql") {
      return nextResolve(
        new URL("./sql-plugin-mock.mjs", import.meta.url).href,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
});

let testId = 0;
const freshDatabase = () => import(`../src/lib/database.ts?test=${++testId}`);

test("concurrent startup queries share one pending database initialization", async () => {
  const { getDatabase } = await freshDatabase();
  const loading = Promise.withResolvers();
  let loads = 0;
  mockLoad((path) => {
    assert.equal(path, "sqlite:subscriptions.db");
    loads++;
    return loading.promise;
  });
  const queries = Array.from({ length: 20 }, () => getDatabase());
  assert.equal(loads, 1);
  const database = { close: async () => {} };
  loading.resolve(database);
  for (const result of await Promise.all(queries)) {
    assert.equal(result, database);
  }
  assert.equal(await getDatabase(), database);
  assert.equal(loads, 1);
});

test("failed initialization never silently retries without migrations", async () => {
  const { getDatabase } = await freshDatabase();
  let loads = 0;
  const failure = new Error("migration 4 checksum mismatch");
  mockLoad(() => {
    loads++;
    return Promise.reject(failure);
  });
  const results = await Promise.allSettled([getDatabase(), getDatabase()]);
  for (const result of results) {
    assert.equal(result.status, "rejected");
    assert.equal(result.reason, failure);
  }
  await assert.rejects(getDatabase(), (error) => error === failure);
  assert.equal(loads, 1);
});

test("close waits for initialization and concurrent closes run once", async () => {
  const { getDatabase, closeDatabase } = await freshDatabase();
  const loading = Promise.withResolvers();
  let closes = 0;
  mockLoad(() => loading.promise);
  const query = getDatabase();
  const first = closeDatabase();
  const second = closeDatabase();
  assert.equal(closes, 0);
  loading.resolve({
    close: async () => {
      closes++;
    },
  });
  await Promise.all([query, first, second]);
  assert.equal(closes, 1);
});

test("queries during close wait and reopen a single new connection", async () => {
  const { getDatabase, closeDatabase } = await freshDatabase();
  const closing = Promise.withResolvers();
  const first = { close: () => closing.promise };
  const second = { close: async () => {} };
  let loads = 0;
  mockLoad(async () => (++loads === 1 ? first : second));
  assert.equal(await getDatabase(), first);
  const close = closeDatabase();
  const queries = [getDatabase(), getDatabase()];
  assert.equal(loads, 1);
  closing.resolve();
  await close;
  assert.deepEqual(await Promise.all(queries), [second, second]);
  assert.equal(loads, 2);
});
