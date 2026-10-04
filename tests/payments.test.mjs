import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resetDatabase, getDatabase } from "./database-helper.mjs";

// Use the actual repositories and migration SQL with a real, isolated SQLite DB.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/database")
      return nextResolve(
        new URL("./database-helper.mjs", import.meta.url).href,
        context,
      );
    if (specifier.startsWith("@/"))
      return nextResolve(
        new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(url)) return nextResolve(url.href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { subscriptionRepository: subscriptions } =
  await import("../src/features/subscriptions/repository.ts");
const { snapshotRepository: snapshots } =
  await import("../src/features/snapshots/repository.ts");
const { generateMonthlyItems, paymentTotals, toDateKey, toMonthKey } =
  await import("../src/features/snapshots/logic.ts");
const today = new Date();
const currentMonth = toMonthKey(today);
const nextMonth = toMonthKey(
  new Date(today.getFullYear(), today.getMonth() + 1, 1),
);
const lastMonth = toMonthKey(
  new Date(today.getFullYear(), today.getMonth() - 1, 1),
);
const date = (month, day) =>
  new Date(`${month}-${String(day).padStart(2, "0")}T12:00:00`);
const create = (input = {}) =>
  subscriptions.create({
    name: "Kira",
    type: "other",
    category: "Housing",
    frequency: "monthly",
    recurrenceType: "recurring",
    amountMode: "fixed",
    amount: 15000,
    dayOfMonth: 15,
    startDate: date(lastMonth, 1),
    ...input,
  });
beforeEach(() => resetDatabase());

test("rent repeats on the 15th at its fixed price", async () => {
  await create();
  for (const month of [currentMonth, nextMonth]) {
    const snapshot = await snapshots.getMonth(month);
    assert.equal(snapshot.items.length, 1);
    assert.equal(snapshot.items[0].amount, 15000);
    assert.equal(snapshot.items[0].date.getDate(), 15);
  }
});
test("variable bills start blank, retain only the entered period amount/date after refresh/reload", async () => {
  const bill = await create({
    name: "Su",
    type: "bill",
    category: "Utilities",
    amountMode: "variable",
    amount: 999,
  });
  let current = await snapshots.getMonth(currentMonth);
  const itemId = current.items[0].id;
  assert.equal(current.items[0].amount, undefined);
  await snapshots.updateItemDetails(itemId, 348.75, `${currentMonth}-22`);
  await subscriptions.update(bill.id, {
    notes: "Değişen kayıt",
    dayOfMonth: 16,
  });
  await snapshots.refreshRollingSnapshots();
  current = await snapshots.getMonth(currentMonth);
  assert.equal(current.items[0].id, itemId);
  assert.equal(current.items[0].amount, 348.75);
  assert.equal(current.items[0].date.getDate(), 22);
  assert.equal(
    (await snapshots.getMonth(nextMonth)).items[0].amount,
    undefined,
  );
  assert.equal(
    (await snapshots.getMonth(nextMonth)).items[0].date.getDate(),
    16,
  );
});
test("simultaneous snapshot reads and amount edits preserve the entry and stable ID", async () => {
  await create({ amountMode: "variable" });
  const snapshot = await snapshots.getMonth(currentMonth);
  await Promise.all([
    snapshots.getMonth(currentMonth),
    snapshots.updateItemDetails(
      snapshot.items[0].id,
      123,
      `${currentMonth}-19`,
    ),
    snapshots.refreshRollingSnapshots(),
  ]);
  const latest = await snapshots.getMonth(currentMonth);
  assert.equal(latest.items.length, 1);
  assert.equal(latest.items[0].id, snapshot.items[0].id);
  assert.equal(latest.items[0].amount, 123);
});
test("a variable bill requires an entered amount to mark paid; zero is a valid amount", async () => {
  await create({ amountMode: "variable" });
  const {
    items: [bill],
  } = await snapshots.getMonth(currentMonth);
  await assert.rejects(
    snapshots.updateItemStatus(bill.id, "done"),
    /tutarını girin/,
  );
  await snapshots.updateItemDetails(bill.id, 0, toDateKey(bill.date));
  await snapshots.updateItemStatus(bill.id, "done");
  const latest = (await snapshots.getMonth(currentMonth)).items[0];
  assert.equal(latest.amount, 0);
  assert.equal(latest.status, "done");
  await assert.rejects(
    snapshots.updateItemDetails(bill.id, null, toDateKey(bill.date)),
    /boş bırakılamaz/,
  );
});
test("skipping a month needs no amount, suppresses its reminder and does not skip next month", async () => {
  await create({ amountMode: "variable" });
  const bill = (await snapshots.getMonth(currentMonth)).items[0];
  await snapshots.updateItemStatus(bill.id, "skipped");
  const current = await snapshots.getMonth(currentMonth);
  assert.equal(current.items[0].status, "skipped");
  assert.equal(
    (
      await snapshots.getUpcomingPayments(
        date(currentMonth, 1),
        date(currentMonth, 28),
      )
    ).length,
    0,
  );
  assert.equal(
    (await snapshots.getMonth(nextMonth)).items[0].status,
    "planned",
  );
});
test("separate market expenses occur on their actual dates and never recur next month", async () => {
  await create({
    name: "Market",
    category: "Food",
    recurrenceType: "one_time",
    amount: 410,
    startDate: date(currentMonth, 2),
  });
  await create({
    name: "Market",
    category: "Food",
    recurrenceType: "one_time",
    amount: 1250,
    startDate: date(currentMonth, 24),
  });
  const current = await snapshots.getMonth(currentMonth);
  assert.deepEqual(
    current.items.map((item) => item.amount),
    [410, 1250],
  );
  assert.equal((await snapshots.getMonth(nextMonth)).items.length, 0);
  assert.equal(paymentTotals(current.items).totals.get("TRY"), 1660);
});
test("adding a past market expense leaves all archived bills intact", async () => {
  const bill = await create({ amount: 700 });
  await snapshots.replaceAll([
    {
      id: "archive",
      month: lastMonth,
      createdAt: today,
      updatedAt: today,
      items: [
        {
          id: "old",
          subscriptionId: bill.id,
          title: "Eski kira",
          category: "Housing",
          subscriptionType: "other",
          kind: "payment",
          amount: 600,
          currency: "TRY",
          date: date(lastMonth, 15),
          status: "done",
        },
      ],
    },
  ]);
  const market = await create({
    name: "Market",
    category: "Food",
    recurrenceType: "one_time",
    amount: 80,
    startDate: date(lastMonth, 23),
  });
  await snapshots.syncOneTimeRecord(market);
  await snapshots.refreshRollingSnapshots();
  const archive = await snapshots.getMonth(lastMonth);
  assert.equal(archive.items.length, 2);
  assert.equal(archive.items[0].amount, 600);
  assert.equal(archive.items[0].status, "done");
  assert.equal(archive.items[1].amount, 80);
});
test("fixed price changes apply forward while paid periods and archived prices stay intact", async () => {
  const sub = await create({ amount: 100 });
  const current = await snapshots.getMonth(currentMonth);
  await snapshots.updateItemStatus(current.items[0].id, "done");
  await subscriptions.update(sub.id, { amount: 130 });
  await snapshots.refreshRollingSnapshots();
  assert.equal((await snapshots.getMonth(currentMonth)).items[0].amount, 100);
  assert.equal((await snapshots.getMonth(nextMonth)).items[0].amount, 130);
});
test("an amount or date override on a fixed subscription belongs to only that period", async () => {
  await create({ amount: 100 });
  const current = await snapshots.getMonth(currentMonth);
  await snapshots.updateItemDetails(
    current.items[0].id,
    90,
    `${currentMonth}-21`,
  );
  await snapshots.refreshRollingSnapshots();
  assert.equal((await snapshots.getMonth(currentMonth)).items[0].amount, 90);
  assert.equal((await snapshots.getMonth(nextMonth)).items[0].amount, 100);
});
test("reminders use the actual entered amount and actual date, never the template price", async () => {
  await create({ amountMode: "variable", amount: 900 });
  const bill = (await snapshots.getMonth(currentMonth)).items[0];
  await snapshots.updateItemDetails(bill.id, 412, `${currentMonth}-20`);
  const payments = await snapshots.getUpcomingPayments(
    date(currentMonth, 20),
    date(currentMonth, 20),
  );
  assert.equal(payments.length, 1);
  assert.equal(payments[0].amount, 412);
  assert.equal(payments[0].date.getDate(), 20);
});
test("invalid amounts, invalid dates and dates outside the period are rejected", async () => {
  await create();
  const item = (await snapshots.getMonth(currentMonth)).items[0];
  for (const amount of [-1, NaN, Infinity])
    await assert.rejects(
      snapshots.updateItemDetails(item.id, amount, `${currentMonth}-12`),
    );
  for (const invalid of [`${nextMonth}-12`, `${currentMonth}-99`, ""])
    await assert.rejects(snapshots.updateItemDetails(item.id, 20, invalid));
  assert.equal((await snapshots.getMonth(currentMonth)).items[0].amount, 15000);
});
test("backup round-trip retains future entries, override flags, dates and payment status", async () => {
  await create({ amountMode: "variable" });
  const bill = (await snapshots.getMonth(nextMonth)).items[0];
  await snapshots.updateItemDetails(bill.id, 87, `${nextMonth}-18`);
  const backup = await snapshots.getAll(true);
  const decoded = JSON.parse(JSON.stringify(backup)).map((snapshot) => ({
    ...snapshot,
    createdAt: new Date(snapshot.createdAt),
    updatedAt: new Date(snapshot.updatedAt),
    items: snapshot.items.map((item) => ({
      ...item,
      date: new Date(item.date),
      scheduledDate: new Date(item.scheduledDate ?? item.date),
    })),
  }));
  await snapshots.replaceAll(decoded);
  await snapshots.refreshRollingSnapshots();
  const restored = (await snapshots.getMonth(nextMonth)).items[0];
  assert.equal(restored.amount, 87);
  assert.equal(restored.amountOverridden, true);
  assert.equal(restored.date.getDate(), 18);
});

test("cancelling a subscription preserves an already paid current record and removes future payments", async () => {
  const sub = await create();
  const current = await snapshots.getMonth(currentMonth);
  await snapshots.updateItemStatus(current.items[0].id, "done");
  await subscriptions.update(sub.id, { isActive: false });
  await snapshots.refreshRollingSnapshots();
  assert.equal(
    (await snapshots.getMonth(currentMonth)).items[0].status,
    "done",
  );
  assert.equal((await snapshots.getMonth(nextMonth)).items.length, 0);
});
test("a late invoice amount can be entered explicitly in its own past month and survives template edits", async () => {
  const sub = await create({ amountMode: "variable" });
  await snapshots.replaceAll([
    {
      id: "archive",
      month: lastMonth,
      createdAt: today,
      updatedAt: today,
      items: [
        {
          id: "old",
          subscriptionId: sub.id,
          title: "Su",
          category: "Utilities",
          subscriptionType: "bill",
          kind: "payment",
          amountMode: "variable",
          currency: "TRY",
          date: date(lastMonth, 15),
          status: "planned",
        },
      ],
    },
  ]);
  const past = await snapshots.getMonth(lastMonth);
  await snapshots.updateItemDetails(past.items[0].id, 65, `${lastMonth}-21`);
  await snapshots.updateItemStatus(past.items[0].id, "done");
  await subscriptions.update(sub.id, {
    name: "Güncellenen kayıt",
    amountMode: "fixed",
    amount: 150,
  });
  await snapshots.refreshRollingSnapshots();
  const preserved = (await snapshots.getMonth(lastMonth)).items[0];
  assert.equal(preserved.amount, 65);
  assert.equal(preserved.status, "done");
  assert.equal(preserved.title, "Su");
});
test("correcting the month of a backdated one-off moves only that expense", async () => {
  const expense = await create({
    name: "Market",
    recurrenceType: "one_time",
    startDate: date(lastMonth, 2),
    amount: 20,
  });
  await snapshots.syncOneTimeRecord(expense);
  const updated = await subscriptions.update(expense.id, {
    startDate: date(currentMonth, 8),
    amount: 30,
  });
  await snapshots.syncOneTimeRecord(updated, expense);
  await snapshots.refreshRollingSnapshots();
  assert.equal((await snapshots.getMonth(lastMonth)).items.length, 0);
  assert.equal((await snapshots.getMonth(currentMonth)).items[0].amount, 30);
  assert.equal((await snapshots.getMonth(nextMonth)).items.length, 0);
});
test("clearing a fixed template amount persists NULL instead of silently retaining its former price", async () => {
  const sub = await create();
  await subscriptions.update(sub.id, { amount: null });
  assert.equal((await subscriptions.getById(sub.id)).amount, undefined);
  assert.equal(
    (await snapshots.getMonth(nextMonth)).items[0].amount,
    undefined,
  );
});
test("weekly occurrences keep independent amounts and dates; month-end and yearly dates clamp", async () => {
  const sub = await create({ frequency: "weekly", amountMode: "variable" });
  const current = await snapshots.getMonth(currentMonth);
  assert.ok(current.items.length >= 4);
  await snapshots.updateItemDetails(
    current.items[0].id,
    5,
    toDateKey(current.items[0].date),
  );
  const refreshed = await snapshots.getMonth(currentMonth);
  assert.equal(refreshed.items[0].amount, 5);
  assert.equal(refreshed.items[1].amount, undefined);
  const monthly = {
    ...sub,
    recurrence: { frequency: "monthly", dayOfMonth: 31 },
    startDate: date("2020-01", 1),
  };
  assert.equal(
    generateMonthlyItems([monthly], "2027-02")[0].date.getDate(),
    28,
  );
  const yearly = {
    ...monthly,
    recurrence: { frequency: "yearly" },
    startDate: date("2024-02", 29),
  };
  assert.equal(generateMonthlyItems([yearly], "2027-02")[0].date.getDate(), 28);
});
test("totals exclude skipped/statement entries and report missing amounts separately", () => {
  const entries = [
    { kind: "payment", amount: 100, currency: "TRY", status: "done" },
    { kind: "due", amount: undefined, currency: "TRY", status: "planned" },
    { kind: "payment", amount: 999, currency: "TRY", status: "skipped" },
    { kind: "statement", amount: 888, currency: "TRY" },
  ];
  assert.equal(paymentTotals(entries).totals.get("TRY"), 100);
  assert.equal(paymentTotals(entries).missingCount, 1);
});
test("v5 migrates legacy utility bills but preserves housing, telecom, paid amounts and history", async () => {
  const db = resetDatabase(4);
  for (const [id, type, category] of [
    ["water", "bill", "Utilities"],
    ["rent", "other", "Housing"],
    ["internet", "bill", "Telecom"],
  ])
    db.prepare(
      "INSERT INTO subscriptions (id, name, type, category, frequency, amount) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(id, id, type, category, "monthly", 100);
  for (const [id, month] of [
    ["current", currentMonth],
    ["past", lastMonth],
    ["future", nextMonth],
  ])
    db.prepare("INSERT INTO monthly_snapshots VALUES (?, ?, ?, ?)").run(
      id,
      month,
      today.toISOString(),
      today.toISOString(),
    );
  for (const [id, snapshot, status] of [
    ["unpaid", "current", "planned"],
    ["paid", "current", "done"],
    ["history", "past", "planned"],
    ["future", "future", "planned"],
  ])
    db.prepare(
      `INSERT INTO snapshot_items (id, snapshot_id, subscription_id, name, type, category, event_kind, occurrence_date, amount, currency, status, created_at) VALUES (?, ?, 'water', 'Su', 'bill', 'Utilities', 'payment', ?, 100, 'TRY', ?, ?)`,
    ).run(
      id,
      snapshot,
      `${snapshot === "past" ? lastMonth : snapshot === "future" ? nextMonth : currentMonth}-15`,
      status,
      today.toISOString(),
    );
  db.exec(
    readFileSync(
      new URL(
        "../src-tauri/migrations/005_variable_amounts.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(
    db.prepare("SELECT amount FROM snapshot_items WHERE id = 'future'").get()
      .amount,
    null,
  );
  for (const id of ["paid", "history", "unpaid"])
    assert.equal(
      db.prepare("SELECT amount FROM snapshot_items WHERE id = ?").get(id)
        .amount,
      100,
    );
  assert.equal(
    db.prepare("SELECT amount_mode FROM subscriptions WHERE id = 'water'").get()
      .amount_mode,
    "variable",
  );
  for (const id of ["rent", "internet"])
    assert.equal(
      db.prepare("SELECT amount_mode FROM subscriptions WHERE id = ?").get(id)
        .amount_mode,
      "fixed",
    );
  assert.equal((await getDatabase()).select instanceof Function, true);
});
