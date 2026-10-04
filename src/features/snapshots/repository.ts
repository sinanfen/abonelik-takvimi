import { nanoid } from 'nanoid';
import { getDatabase } from '@/lib/database';
import { subscriptionRepository } from '@/features/subscriptions/repository';
import type {
    AmountMode,
    Category,
    EventKind,
    MonthlySnapshot,
    PaymentStatus,
    Subscription,
    SubscriptionEvent,
    SubscriptionType,
} from '@/types';
import {
    dateAtNoon,
    generateMonthlyItems,
    mergeOccurrence,
    occurrenceKey,
    toDateKey,
    toMonthKey,
    validateOccurrenceInput,
} from './logic';
export { generateMonthlyItems, toMonthKey } from './logic';

interface SnapshotRow {
    id: string;
    month: string;
    created_at: string;
    updated_at: string;
}
interface SnapshotItemRow {
    id: string;
    snapshot_id: string;
    subscription_id: string | null;
    name: string;
    type: SubscriptionType;
    category: Category;
    event_kind: EventKind;
    occurrence_date: string;
    scheduled_date: string | null;
    amount: number | null;
    amount_mode: AmountMode;
    amount_overridden: number;
    date_overridden: number;
    currency: string;
    notes: string | null;
    status: PaymentStatus;
    sort_order: number | null;
}
function snapshotItemToEvent(row: SnapshotItemRow): SubscriptionEvent {
    return {
        id: row.id,
        subscriptionId: row.subscription_id ?? '',
        date: dateAtNoon(row.occurrence_date),
        scheduledDate: dateAtNoon(row.scheduled_date ?? row.occurrence_date),
        kind: row.event_kind,
        title: row.name,
        category: row.category,
        amount: row.amount ?? undefined,
        amountMode: row.amount_mode,
        amountOverridden: !!row.amount_overridden,
        dateOverridden: !!row.date_overridden,
        currency: row.currency,
        subscriptionType: row.type,
        notes: row.notes ?? undefined,
        status: row.status,
        sortOrder: row.sort_order ?? 0,
    };
}

// Prevent concurrent queries/refreshes from overwriting an edited occurrence.
let pending: Promise<unknown> = Promise.resolve();
function serialized<T>(operation: () => Promise<T>): Promise<T> {
    const next = pending.then(operation);
    pending = next.catch(() => undefined);
    return next;
}
async function getSnapshotByMonth(month: string): Promise<MonthlySnapshot | null> {
    const db = await getDatabase();
    const [snapshot] = await db.select<SnapshotRow[]>('SELECT * FROM monthly_snapshots WHERE month = ?', [month]);
    if (!snapshot) return null;
    const rows = await db.select<SnapshotItemRow[]>(
        'SELECT * FROM snapshot_items WHERE snapshot_id = ? ORDER BY occurrence_date, sort_order, name',
        [snapshot.id],
    );
    return {
        id: snapshot.id,
        month: snapshot.month,
        items: rows.map(snapshotItemToEvent),
        createdAt: new Date(snapshot.created_at),
        updatedAt: new Date(snapshot.updated_at),
    };
}
async function ensureSnapshot(month: string): Promise<MonthlySnapshot> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.execute(
        'INSERT OR IGNORE INTO monthly_snapshots (id, month, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [nanoid(), month, now, now],
    );
    const snapshot = await getSnapshotByMonth(month);
    if (!snapshot) throw new Error('Aylık snapshot oluşturulamadı');
    return snapshot;
}
async function writeItem(snapshotId: string, item: SubscriptionEvent): Promise<void> {
    const db = await getDatabase();
    await db.execute(
        `INSERT INTO snapshot_items (
        id, snapshot_id, subscription_id, name, type, category, event_kind, occurrence_date,
        amount, currency, notes, status, sort_order, created_at, amount_mode,
        scheduled_date, amount_overridden, date_overridden
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, type = excluded.type, category = excluded.category,
        occurrence_date = excluded.occurrence_date, amount = excluded.amount, currency = excluded.currency,
        notes = excluded.notes, status = excluded.status, sort_order = excluded.sort_order,
        amount_mode = excluded.amount_mode, scheduled_date = excluded.scheduled_date,
        amount_overridden = excluded.amount_overridden, date_overridden = excluded.date_overridden`,
        [
            item.id || nanoid(),
            snapshotId,
            item.subscriptionId || null,
            item.title,
            item.subscriptionType,
            item.category,
            item.kind,
            toDateKey(item.date),
            item.amount ?? null,
            item.currency,
            item.notes ?? null,
            item.status ?? 'planned',
            item.sortOrder ?? 0,
            new Date().toISOString(),
            item.amountMode ?? 'fixed',
            toDateKey(item.scheduledDate ?? item.date),
            item.amountOverridden ? 1 : 0,
            item.dateOverridden ? 1 : 0,
        ],
    );
}
async function touchSnapshot(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('UPDATE monthly_snapshots SET updated_at = ? WHERE id = ?', [new Date().toISOString(), id]);
}
async function syncMonth(month: string, subscriptions: Subscription[]): Promise<MonthlySnapshot> {
    const db = await getDatabase();
    const snapshot = await ensureSnapshot(month);
    const frequencies = new Map(subscriptions.map((sub) => [sub.id, sub.recurrence.frequency]));
    const previousItems = new Map(
        snapshot.items.map((item) => [
            occurrenceKey(
                item.subscriptionId,
                item.kind,
                item.scheduledDate ?? item.date,
                frequencies.get(item.subscriptionId) ?? 'monthly',
            ),
            item,
        ]),
    );
    const keptIds = new Set<string>();
    for (const generated of generateMonthlyItems(subscriptions, month)) {
        const key = occurrenceKey(
            generated.subscription.id,
            generated.kind,
            generated.date,
            generated.subscription.recurrence.frequency,
        );
        const item = mergeOccurrence(generated, previousItems.get(key));
        if (!item.id) item.id = nanoid();
        keptIds.add(item.id);
        await writeItem(snapshot.id, item);
    }
    for (const old of snapshot.items) {
        // Imported detached records have no template and stay in the snapshot.
        const recorded =
            old.status === 'done' || old.status === 'skipped' || old.amountOverridden || old.dateOverridden;
        if (old.subscriptionId && !keptIds.has(old.id) && !(month <= toMonthKey(new Date()) && recorded))
            await db.execute('DELETE FROM snapshot_items WHERE id = ?', [old.id]);
    }
    await touchSnapshot(snapshot.id);
    return (await getSnapshotByMonth(month))!;
}

export type ReminderChannel = 'email';
export const snapshotRepository = {
    getMonth(month: string): Promise<MonthlySnapshot | null> {
        return serialized(async () => {
            const currentMonth = toMonthKey(new Date());
            if (month < currentMonth) return getSnapshotByMonth(month);
            const subscriptions = await subscriptionRepository.getActive();
            const snapshot = await syncMonth(month, subscriptions);
            if (month === currentMonth) {
                const today = new Date();
                for (let offset = 1; offset <= 12; offset++) {
                    const nextMonth = toMonthKey(new Date(today.getFullYear(), today.getMonth() + offset, 1, 12));
                    if (!(await getSnapshotByMonth(nextMonth))) await syncMonth(nextMonth, subscriptions);
                }
            }
            return snapshot;
        });
    },
    getAll(includeFuture = false): Promise<MonthlySnapshot[]> {
        return serialized(async () => {
            const db = await getDatabase();
            const rows = await db.select<SnapshotRow[]>(
                includeFuture
                    ? 'SELECT * FROM monthly_snapshots ORDER BY month DESC'
                    : 'SELECT * FROM monthly_snapshots WHERE month <= ? ORDER BY month DESC',
                includeFuture ? [] : [toMonthKey(new Date())],
            );
            const snapshots = await Promise.all(rows.map((row) => getSnapshotByMonth(row.month)));
            return snapshots.filter((snapshot): snapshot is MonthlySnapshot => snapshot !== null);
        });
    },
    updateItemStatus(itemId: string, status: PaymentStatus): Promise<void> {
        return serialized(async () => {
            const db = await getDatabase();
            const [row] = await db.select<SnapshotItemRow[]>('SELECT * FROM snapshot_items WHERE id = ?', [itemId]);
            if (!row || !['payment', 'due'].includes(row.event_kind)) throw new Error('Ödeme kaydı bulunamadı.');
            if (status === 'done' && row.amount_mode === 'variable' && row.amount === null)
                throw new Error('Ödendi olarak işaretlemeden önce bu dönemin tutarını girin.');
            await db.execute('UPDATE snapshot_items SET status = ? WHERE id = ?', [status, itemId]);
            await touchSnapshot(row.snapshot_id);
        });
    },
    updateItemDetails(itemId: string, amount: number | null, date: string): Promise<void> {
        return serialized(async () => {
            const db = await getDatabase();
            const [row] = await db.select<(SnapshotItemRow & { month: string })[]>(
                `SELECT i.*, s.month FROM snapshot_items i JOIN monthly_snapshots s ON s.id = i.snapshot_id WHERE i.id = ?`,
                [itemId],
            );
            if (!row || !['payment', 'due'].includes(row.event_kind)) throw new Error('Ödeme kaydı bulunamadı.');
            validateOccurrenceInput(amount, date, row.month);
            if (row.status === 'done' && row.amount_mode === 'variable' && amount === null)
                throw new Error('Ödenmiş faturanın tutarı boş bırakılamaz.');
            await db.execute(
                'UPDATE snapshot_items SET amount = ?, occurrence_date = ?, amount_overridden = 1, date_overridden = 1 WHERE id = ?',
                [amount, date, itemId],
            );
            await touchSnapshot(row.snapshot_id);
        });
    },
    // A deliberate past expense updates only that record in the archived month.
    syncOneTimeRecord(subscription: Subscription, previous?: Subscription | null): Promise<void> {
        return serialized(async () => {
            const db = await getDatabase();
            if (
                previous?.recurrenceType === 'one_time' &&
                previous.startDate &&
                subscription.startDate &&
                previous.isActive &&
                subscription.isActive &&
                subscription.recurrenceType === 'one_time' &&
                toMonthKey(previous.startDate) !== toMonthKey(subscription.startDate)
            ) {
                const oldMonth = toMonthKey(previous.startDate);
                const oldSnapshot = await getSnapshotByMonth(oldMonth);
                if (oldSnapshot) {
                    await db.execute(
                        'DELETE FROM snapshot_items WHERE snapshot_id = ? AND subscription_id = ? AND event_kind = ?',
                        [oldSnapshot.id, previous.id, 'payment'],
                    );
                    await touchSnapshot(oldSnapshot.id);
                }
            }
            if (subscription.recurrenceType !== 'one_time' || !subscription.startDate) return;
            const month = toMonthKey(subscription.startDate);
            if (month >= toMonthKey(new Date())) return;
            const snapshot = await ensureSnapshot(month);
            const generated = generateMonthlyItems([subscription], month)[0];
            if (!generated) return;
            const previousItem = snapshot.items.find(
                (item) => item.subscriptionId === subscription.id && item.kind === 'payment',
            );
            const merged = mergeOccurrence(generated, previousItem);
            // Explicitly correcting a one-off expense also corrects its stored amount/date.
            await writeItem(snapshot.id, {
                ...merged,
                amount: generated.amount,
                date: generated.date,
                amountOverridden: false,
                dateOverridden: false,
            });
            await touchSnapshot(snapshot.id);
        });
    },
    getUpcomingPayments(from: Date, through: Date): Promise<SubscriptionEvent[]> {
        return serialized(async () => {
            const db = await getDatabase();
            const rows = await db.select<SnapshotItemRow[]>(
                `SELECT * FROM snapshot_items WHERE event_kind IN ('payment', 'due') AND status = 'planned' AND occurrence_date BETWEEN ? AND ? ORDER BY occurrence_date`,
                [toDateKey(from), toDateKey(through)],
            );
            return rows.map(snapshotItemToEvent);
        });
    },
    async hasReminderDispatch(id: string, date: Date, days: number, channel: ReminderChannel): Promise<boolean> {
        const db = await getDatabase();
        const rows = await db.select<{ found: number }[]>(
            'SELECT 1 AS found FROM reminder_dispatches WHERE subscription_id = ? AND occurrence_date = ? AND reminder_days = ? AND channel = ? LIMIT 1',
            [id, toDateKey(date), days, channel],
        );
        return rows.length > 0;
    },
    async recordReminderDispatch(id: string, date: Date, days: number, channel: ReminderChannel): Promise<void> {
        const db = await getDatabase();
        await db.execute(
            'INSERT OR IGNORE INTO reminder_dispatches (id, subscription_id, occurrence_date, reminder_days, channel, sent_at) VALUES (?, ?, ?, ?, ?, ?)',
            [nanoid(), id, toDateKey(date), days, channel, new Date().toISOString()],
        );
    },
    refreshRollingSnapshots(monthCount = 12): Promise<void> {
        return serialized(async () => {
            const subscriptions = await subscriptionRepository.getActive();
            const today = new Date();
            for (let offset = 0; offset <= monthCount; offset++)
                await syncMonth(
                    toMonthKey(new Date(today.getFullYear(), today.getMonth() + offset, 1, 12)),
                    subscriptions,
                );
        });
    },
    replaceAll(snapshots: MonthlySnapshot[]): Promise<void> {
        return serialized(async () => {
            const db = await getDatabase();
            for (const source of snapshots) {
                const existing = await getSnapshotByMonth(source.month);
                const id = existing?.id ?? nanoid();
                await db.execute(
                    `INSERT INTO monthly_snapshots (id, month, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(month) DO UPDATE SET updated_at = excluded.updated_at`,
                    [id, source.month, source.createdAt.toISOString(), source.updatedAt.toISOString()],
                );
                await db.execute('DELETE FROM snapshot_items WHERE snapshot_id = ?', [id]);
                for (const item of source.items) await writeItem(id, { ...item, id: nanoid() });
            }
        });
    },
};
