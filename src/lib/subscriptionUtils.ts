import { addDays, addMonths, isSameDay, startOfDay } from 'date-fns';
import type { Subscription } from '@/types';

function clampedMonthlyDate(base: Date, day: number): Date {
    const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    return startOfDay(new Date(base.getFullYear(), base.getMonth(), Math.min(day, lastDay)));
}

export function getNextPaymentDate(subscription: Subscription, from = new Date()): Date | null {
    if (!subscription.isActive) return null;
    const today = startOfDay(from);
    const startDate = subscription.startDate ? startOfDay(subscription.startDate) : null;
    const endDate = subscription.endDate ? startOfDay(subscription.endDate) : null;

    if (subscription.recurrenceType === 'one_time') {
        if (!startDate || startDate < today || (endDate && startDate > endDate)) return null;
        return startDate;
    }

    const anchor = startDate ?? startOfDay(subscription.createdAt);
    let nextDate: Date;

    if (subscription.recurrence.frequency === 'weekly') {
        nextDate = addDays(today, (anchor.getDay() - today.getDay() + 7) % 7);
    } else if (subscription.recurrence.frequency === 'yearly') {
        nextDate = startOfDay(new Date(today.getFullYear(), anchor.getMonth(), anchor.getDate()));
        if (nextDate < today) {
            nextDate = startOfDay(new Date(today.getFullYear() + 1, anchor.getMonth(), anchor.getDate()));
        }
    } else {
        const paymentDay = subscription.type === 'credit_card'
            ? (subscription.dueDay ?? subscription.recurrence.dayOfMonth ?? 1)
            : (subscription.recurrence.dayOfMonth ?? anchor.getDate());
        nextDate = clampedMonthlyDate(today, paymentDay);
        if (nextDate < today) nextDate = clampedMonthlyDate(addMonths(today, 1), paymentDay);
    }

    if (startDate && nextDate < startDate) {
        if (subscription.recurrence.frequency === 'weekly') {
            nextDate = addDays(startDate, (anchor.getDay() - startDate.getDay() + 7) % 7);
        } else if (subscription.recurrence.frequency === 'yearly') {
            nextDate = anchor;
        } else {
            const paymentDay = subscription.type === 'credit_card'
                ? (subscription.dueDay ?? subscription.recurrence.dayOfMonth ?? anchor.getDate())
                : (subscription.recurrence.dayOfMonth ?? anchor.getDate());
            nextDate = clampedMonthlyDate(startDate, paymentDay);
            if (nextDate < startDate) nextDate = clampedMonthlyDate(addMonths(startDate, 1), paymentDay);
        }
    }

    return endDate && nextDate > endDate ? null : nextDate;
}

export function isReminderDue(subscription: Subscription): boolean {
    if (!subscription.reminders?.length) return false;
    const today = startOfDay(new Date());
    const paymentDate = getNextPaymentDate(subscription, today);
    if (!paymentDate) return false;

    return subscription.reminders.some((daysBefore) =>
        isSameDay(today, addDays(paymentDate, -daysBefore)),
    );
}
