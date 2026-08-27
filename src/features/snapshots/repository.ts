import { nanoid } from 'nanoid';
import { getDatabase } from '@/lib/database';
import { subscriptionRepository } from '@/features/subscriptions/repository';
import type {
    Category,
    EventKind,
    MonthlySnapshot,
    Subscription,
    SubscriptionEvent,
    SubscriptionType,
} from '@/types';

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
    amount: number | null;
    currency: string;
    notes: string | null;
    status: 'planned' | 'done' | 'skipped';
    sort_order: number | null;
}

export function toMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateAtNoon(dateKey: string): Date {
    return new Date(`${dateKey}T12:00:00`);
}

function snapshotItemToEvent(row: SnapshotItemRow): SubscriptionEvent {
    return {
        id: row.id,
        subscriptionId: row.subscription_id ?? '',
        date: dateAtNoon(row.occurrence_date),
        kind: row.event_kind,
        title: row.name,
        category: row.category,
        amount: row.amount ?? undefined,
        currency: row.currency,
        subscriptionType: row.type,
        notes: row.notes ?? undefined,
        status: row.status,
        sortOrder: row.sort_order ?? 0,
    };
}

function isDateInSubscriptionPeriod(date: Date, subscription: Subscription): boolean {
    const dateKey = toDateKey(date);
    const startKey = subscription.startDate ? toDateKey(subscription.startDate) : null;
    const endKey = subscription.endDate ? toDateKey(subscription.endDate) : null;
    return (!startKey || dateKey >= startKey) && (!endKey || dateKey <= endKey);
}

function dateInMonth(year: number, monthIndex: number, day: number): Date {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return new Date(year, monthIndex, Math.min(Math.max(day, 1), lastDay), 12);
}

interface GeneratedItem {
    subscription: Subscription;
    date: Date;
    kind: EventKind;
    title: string;
    amount?: number;
}

export function generateMonthlyItems(
    subscriptions: Subscription[],
    month: string,
): GeneratedItem[] {
    const [year, monthNumber] = month.split('-').map(Number);
    const monthIndex = monthNumber - 1;
    const monthStart = new Date(year, monthIndex, 1, 12);
    const monthEnd = new Date(year, monthIndex + 1, 0, 12);
    const items: GeneratedItem[] = [];

    const addItem = (
        subscription: Subscription,
        date: Date,
        kind: EventKind,
        title: string,
        amount: number | null | undefined = subscription.amount,
    ) => {
        if (date < monthStart || date > monthEnd || !isDateInSubscriptionPeriod(date, subscription)) return;
        items.push({ subscription, date, kind, title, amount: amount ?? undefined });
    };

    for (const subscription of subscriptions) {
        if (!subscription.isActive) continue;

        if (subscription.recurrenceType === 'one_time') {
            if (subscription.startDate && toMonthKey(subscription.startDate) === month) {
                addItem(subscription, subscription.startDate, 'payment', subscription.name);
            }
            continue;
        }

        if (subscription.type === 'credit_card') {
            if (subscription.statementDay) {
                addItem(
                    subscription,
                    dateInMonth(year, monthIndex, subscription.statementDay),
                    'statement',
                    `${subscription.name} - Hesap Kesim`,
                    null,
                );
            }
            if (subscription.dueDay) {
                addItem(
                    subscription,
                    dateInMonth(year, monthIndex, subscription.dueDay),
                    'due',
                    `${subscription.name} - Son Ödeme`,
                );
            }
            continue;
        }

        const anchor = subscription.startDate ?? subscription.createdAt;
        switch (subscription.recurrence.frequency) {
            case 'weekly': {
                for (let day = 1; day <= monthEnd.getDate(); day += 1) {
                    const occurrence = new Date(year, monthIndex, day, 12);
                    if (occurrence.getDay() === anchor.getDay()) {
                        addItem(subscription, occurrence, 'payment', subscription.name);
                    }
                }
                break;
            }
            case 'yearly': {
                if (anchor.getMonth() === monthIndex) {
                    addItem(
                        subscription,
                        dateInMonth(year, monthIndex, anchor.getDate()),
                        'payment',
                        subscription.name,
                    );
                }
                break;
            }
            case 'monthly':
            case 'custom':
            default:
                addItem(
                    subscription,
                    dateInMonth(year, monthIndex, subscription.recurrence.dayOfMonth ?? anchor.getDate()),
                    'payment',
                    subscription.name,
                );
        }
    }

    return items.sort((a, b) => {
        const dateDifference = a.date.getTime() - b.date.getTime();
        return dateDifference || (a.subscription.sortOrder ?? 0) - (b.subscription.sortOrder ?? 0);
    });
}

async function getSnapshotByMonth(month: string): Promise<MonthlySnapshot | null> {
    const db = await getDatabase();
    const snapshots = await db.select<SnapshotRow[]>(
        'SELECT * FROM monthly_snapshots WHERE month = ?',
        [month],
    );
    const snapshot = snapshots[0];
    if (!snapshot) return null;

    const itemRows = await db.select<SnapshotItemRow[]>(
        `SELECT * FROM snapshot_items
         WHERE snapshot_id = ?
         ORDER BY occurrence_date ASC, sort_order ASC, name ASC`,
        [snapshot.id],
    );

    return {
        id: snapshot.id,
        month: snapshot.month,
        items: itemRows.map(snapshotItemToEvent),
        createdAt: new Date(snapshot.created_at),
        updatedAt: new Date(snapshot.updated_at),
    };
}

async function syncMonth(month: string, subscriptions: Subscription[]): Promise<MonthlySnapshot> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    let snapshot = await getSnapshotByMonth(month);

    if (!snapshot) {
        await db.execute(
            `INSERT INTO monthly_snapshots (id, month, created_at, updated_at)
             VALUES (?, ?, ?, ?)`,
            [nanoid(), month, now, now],
        );
        snapshot = await getSnapshotByMonth(month);
    }

    if (!snapshot) throw new Error('Aylık snapshot oluşturulamadı');

    await db.execute('DELETE FROM snapshot_items WHERE snapshot_id = ?', [snapshot.id]);
    for (const item of generateMonthlyItems(subscriptions, month)) {
        await db.execute(
            `INSERT INTO snapshot_items (
                id, snapshot_id, subscription_id, name, type, category,
                event_kind, occurrence_date, amount, currency, notes, status,
                sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nanoid(),
                snapshot.id,
                item.subscription.id,
                item.title,
                item.subscription.type,
                item.subscription.category,
                item.kind,
                toDateKey(item.date),
                item.amount ?? null,
                item.subscription.currency,
                item.subscription.notes ?? null,
                'planned',
                item.subscription.sortOrder ?? 0,
                now,
            ],
        );
    }
    await db.execute(
        'UPDATE monthly_snapshots SET updated_at = ? WHERE id = ?',
        [now, snapshot.id],
    );

    const result = await getSnapshotByMonth(month);
    if (!result) throw new Error('Aylık snapshot okunamadı');
    return result;
}

export const snapshotRepository = {
    async getMonth(month: string): Promise<MonthlySnapshot | null> {
        const currentMonth = toMonthKey(new Date());
        if (month < currentMonth) return getSnapshotByMonth(month);
        const subscriptions = await subscriptionRepository.getActive();
        const snapshot = await syncMonth(month, subscriptions);

        // Gelecek ayları önceden hazırlamak, uygulama bir süre açılmasa bile
        // o dönemin son bilinen planını geçmişe dönüştürebilmemizi sağlar.
        if (month === currentMonth) {
            const today = new Date();
            for (let offset = 1; offset <= 12; offset += 1) {
                const futureMonth = toMonthKey(
                    new Date(today.getFullYear(), today.getMonth() + offset, 1, 12),
                );
                if (!await getSnapshotByMonth(futureMonth)) {
                    await syncMonth(futureMonth, subscriptions);
                }
            }
        }

        return snapshot;
    },

    async getAll(): Promise<MonthlySnapshot[]> {
        const db = await getDatabase();
        const rows = await db.select<SnapshotRow[]>(
            'SELECT * FROM monthly_snapshots WHERE month <= ? ORDER BY month DESC',
            [toMonthKey(new Date())],
        );
        const snapshots = await Promise.all(rows.map((row) => getSnapshotByMonth(row.month)));
        return snapshots.filter((snapshot): snapshot is MonthlySnapshot => snapshot !== null);
    },

    async refreshRollingSnapshots(monthCount = 12): Promise<void> {
        const subscriptions = await subscriptionRepository.getActive();
        const today = new Date();
        for (let offset = 0; offset <= monthCount; offset += 1) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1, 12);
            await syncMonth(toMonthKey(monthDate), subscriptions);
        }
    },

    async replaceAll(snapshots: MonthlySnapshot[]): Promise<void> {
        const db = await getDatabase();
        for (const snapshot of snapshots) {
            const existing = await getSnapshotByMonth(snapshot.month);
            const snapshotId = existing?.id ?? nanoid();
            await db.execute(
                `INSERT INTO monthly_snapshots (id, month, created_at, updated_at)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(month) DO UPDATE SET updated_at = excluded.updated_at`,
                [snapshotId, snapshot.month, snapshot.createdAt.toISOString(), snapshot.updatedAt.toISOString()],
            );
            const stored = await getSnapshotByMonth(snapshot.month);
            if (!stored) continue;
            await db.execute('DELETE FROM snapshot_items WHERE snapshot_id = ?', [stored.id]);
            for (const item of snapshot.items) {
                await db.execute(
                    `INSERT INTO snapshot_items (
                        id, snapshot_id, subscription_id, name, type, category,
                        event_kind, occurrence_date, amount, currency, notes, status,
                        sort_order, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        nanoid(), stored.id, item.subscriptionId || null, item.title,
                        item.subscriptionType, item.category, item.kind, toDateKey(item.date),
                        item.amount ?? null, item.currency, item.notes ?? null,
                        item.status ?? 'planned', item.sortOrder ?? 0, new Date().toISOString(),
                    ],
                );
            }
        }
    },
};
