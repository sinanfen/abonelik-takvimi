import type { Subscription, SubscriptionEvent, EventKind } from '../../types/index.ts';

export function toMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
export function toDateKey(date: Date): string {
    return `${toMonthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dateAtNoon(key: string): Date {
    return new Date(`${key}T12:00:00`);
}
export interface GeneratedItem {
    subscription: Subscription;
    date: Date;
    kind: EventKind;
    title: string;
    amount?: number;
}

export function generateMonthlyItems(subscriptions: Subscription[], month: string): GeneratedItem[] {
    const [year, monthNumber] = month.split('-').map(Number);
    const monthIndex = monthNumber - 1;
    const monthEnd = new Date(year, monthIndex + 1, 0, 12);
    const items: GeneratedItem[] = [];
    const inMonth = (day: number) => new Date(year, monthIndex, Math.min(Math.max(day, 1), monthEnd.getDate()), 12);
    const addItem = (subscription: Subscription, date: Date, kind: EventKind, title: string) => {
        const key = toDateKey(date);
        if (
            toMonthKey(date) !== month ||
            (subscription.startDate && key < toDateKey(subscription.startDate)) ||
            (subscription.endDate && key > toDateKey(subscription.endDate))
        )
            return;
        items.push({
            subscription,
            date,
            kind,
            title,
            amount:
                kind === 'statement' ||
                (subscription.recurrenceType !== 'one_time' && subscription.amountMode === 'variable')
                    ? undefined
                    : subscription.amount,
        });
    };
    for (const subscription of subscriptions) {
        if (!subscription.isActive) continue;
        if (subscription.recurrenceType === 'one_time') {
            if (subscription.startDate) addItem(subscription, subscription.startDate, 'payment', subscription.name);
            continue;
        }
        if (subscription.type === 'credit_card') {
            if (subscription.statementDay)
                addItem(
                    subscription,
                    inMonth(subscription.statementDay),
                    'statement',
                    `${subscription.name} - Hesap Kesim`,
                );
            if (subscription.dueDay)
                addItem(subscription, inMonth(subscription.dueDay), 'due', `${subscription.name} - Son Ödeme`);
            continue;
        }
        const anchor = subscription.startDate ?? subscription.createdAt;
        switch (subscription.recurrence.frequency) {
            case 'weekly':
                for (let day = 1; day <= monthEnd.getDate(); day++) {
                    const occurrence = inMonth(day);
                    if (occurrence.getDay() === anchor.getDay())
                        addItem(subscription, occurrence, 'payment', subscription.name);
                }
                break;
            case 'yearly':
                if (anchor.getMonth() === monthIndex)
                    addItem(subscription, inMonth(anchor.getDate()), 'payment', subscription.name);
                break;
            default:
                addItem(
                    subscription,
                    inMonth(subscription.recurrence.dayOfMonth ?? anchor.getDate()),
                    'payment',
                    subscription.name,
                );
        }
    }
    return items.sort(
        (a, b) =>
            a.date.getTime() - b.date.getTime() || (a.subscription.sortOrder ?? 0) - (b.subscription.sortOrder ?? 0),
    );
}

// Monthly records remain the same occurrence when their payment day changes.
export function occurrenceKey(id: string, kind: EventKind, date: Date, frequency: string): string {
    return `${id}|${kind}|${frequency === 'weekly' ? toDateKey(date) : toMonthKey(date)}`;
}
export function mergeOccurrence(item: GeneratedItem, previous?: SubscriptionEvent): SubscriptionEvent {
    const { subscription } = item;
    const keepAmount =
        !!previous && !!(previous.amountOverridden || previous.status === 'done' || previous.status === 'skipped');
    return {
        id: previous?.id ?? '',
        subscriptionId: subscription.id,
        date: previous?.dateOverridden ? previous.date : item.date,
        scheduledDate: item.date,
        kind: item.kind,
        title: item.title,
        category: subscription.category,
        amount: keepAmount ? previous.amount : item.amount,
        amountMode: subscription.recurrenceType === 'one_time' ? 'fixed' : subscription.amountMode,
        amountOverridden: keepAmount,
        dateOverridden: previous?.dateOverridden ?? false,
        currency: keepAmount ? previous.currency : subscription.currency,
        subscriptionType: subscription.type,
        notes: subscription.notes,
        status: previous?.status ?? 'planned',
        sortOrder: subscription.sortOrder ?? 0,
    };
}
export function validateOccurrenceInput(amount: number | null, date: string, month: string): void {
    if (amount !== null && (!Number.isFinite(amount) || amount < 0))
        throw new Error('Tutar sıfır veya pozitif bir sayı olmalı.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || toDateKey(dateAtNoon(date)) !== date || date.slice(0, 7) !== month)
        throw new Error('Ödeme tarihi bu snapshot ayı içinde geçerli bir tarih olmalı.');
}
export function paymentTotals(items: SubscriptionEvent[]): {
    totals: Map<string, number>;
    missingCount: number;
} {
    const totals = new Map<string, number>();
    let missingCount = 0;
    for (const item of items) {
        if (!['payment', 'due'].includes(item.kind) || item.status === 'skipped') continue;
        if (item.amount === undefined) {
            missingCount++;
            continue;
        }
        totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.amount);
    }
    return { totals, missingCount };
}
