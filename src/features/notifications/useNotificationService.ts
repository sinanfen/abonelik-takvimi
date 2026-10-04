import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { addDays, isSameDay, startOfDay, subDays } from 'date-fns';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptions } from '@/features/subscriptions';
import { snapshotRepository, useMonthlySnapshot, toMonthKey } from '@/features/snapshots';
import { toDateKey } from '@/features/snapshots/logic';

const sending = new Set<string>();

export function useNotificationService() {
    const { emailRemindersEnabled, emailProvider, emailAddress, emailRecipient } = useSettingsStore();
    const { data: subscriptions } = useSubscriptions();
    const { data: snapshot } = useMonthlySnapshot(toMonthKey(new Date()));

    useEffect(() => {
        if (!emailRemindersEnabled || !subscriptions || !snapshot || !emailAddress || !emailRecipient) return;
        let cancelled = false;
        let checking = false;
        const check = async () => {
            if (checking || cancelled) return;
            checking = true;
            try {
                const today = startOfDay(new Date());
                const maxDays = Math.min(365, Math.max(0, ...subscriptions.flatMap((sub) => sub.reminders)));
                const payments = await snapshotRepository.getUpcomingPayments(today, addDays(today, maxDays));
                for (const payment of payments) {
                    const subscription = subscriptions.find((sub) => sub.id === payment.subscriptionId);
                    if (!subscription?.isActive) continue;
                    for (const days of subscription.reminders) {
                        if (cancelled || !isSameDay(today, subDays(payment.date, days))) continue;
                        const key = `${subscription.id}|${toDateKey(payment.date)}|${days}`;
                        if (sending.has(key)) continue;
                        sending.add(key);
                        try {
                            if (
                                cancelled ||
                                (await snapshotRepository.hasReminderDispatch(
                                    subscription.id,
                                    payment.date,
                                    days,
                                    'email',
                                ))
                            )
                                continue;
                            await invoke('send_payment_reminder', {
                                config: {
                                    provider: emailProvider,
                                    username: emailAddress,
                                    recipient: emailRecipient,
                                },
                                reminder: {
                                    title: payment.title,
                                    amount: payment.amount ?? null,
                                    currency: payment.currency,
                                    occurrenceDate: toDateKey(payment.date),
                                    daysBefore: days,
                                    automaticPayment: subscription.paymentMode === 'automatic',
                                },
                            });
                            await snapshotRepository.recordReminderDispatch(
                                subscription.id,
                                payment.date,
                                days,
                                'email',
                            );
                    } catch (error) {
                        console.error('E-posta hatırlatması gönderilemedi:', error);
                        } finally {
                            sending.delete(key);
                        }
                    }
                }
            } catch (error) {
                console.error('E-posta hatırlatması gönderilemedi:', error);
            } finally {
                checking = false;
            }
        };
        void check();
        const interval = window.setInterval(() => void check(), 60 * 60 * 1000);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [emailRemindersEnabled, emailProvider, emailAddress, emailRecipient, subscriptions, snapshot]);
}
