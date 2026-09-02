import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isSameDay, startOfDay, subDays } from "date-fns";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useSubscriptions } from "@/features/subscriptions";
import { getNextPaymentDate } from "@/lib/subscriptionUtils";
import { snapshotRepository } from "@/features/snapshots";

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function useNotificationService() {
  const { emailRemindersEnabled, emailProvider, emailAddress, emailRecipient } =
    useSettingsStore();
  const { data: subscriptions } = useSubscriptions();

  // Uygulama açıkken açılışta ve saatte bir kontrol edilir.
  useEffect(() => {
    if (
      !emailRemindersEnabled ||
      !subscriptions ||
      !emailAddress ||
      !emailRecipient
    )
      return;
    let isChecking = false;

    const checkAndNotify = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const today = startOfDay(new Date());
        for (const subscription of subscriptions) {
          if (!subscription.isActive || subscription.reminders.length === 0)
            continue;
          const paymentDate = getNextPaymentDate(subscription, today);
          if (!paymentDate) continue;
          const status = await snapshotRepository.getPaymentStatus(
            subscription.id,
            paymentDate,
          );
          if (status === "done" || status === "skipped") continue;

          for (const daysBefore of subscription.reminders) {
            if (!isSameDay(today, subDays(paymentDate, daysBefore))) continue;

            if (
              !(await snapshotRepository.hasReminderDispatch(
                subscription.id,
                paymentDate,
                daysBefore,
                "email",
              ))
            ) {
              try {
                await invoke("send_payment_reminder", {
                  config: {
                    provider: emailProvider,
                    username: emailAddress,
                    recipient: emailRecipient,
                  },
                  reminder: {
                    title: subscription.name,
                    amount: subscription.amount ?? null,
                    currency: subscription.currency,
                    occurrenceDate: toDateKey(paymentDate),
                    daysBefore,
                    automaticPayment: subscription.paymentMode === "automatic",
                  },
                });
                await snapshotRepository.recordReminderDispatch(
                  subscription.id,
                  paymentDate,
                  daysBefore,
                  "email",
                );
              } catch (error) {
                console.error("E-posta hatırlatması gönderilemedi:", error);
              }
            }
          }
        }
      } finally {
        isChecking = false;
      }
    };

    void checkAndNotify();
    const interval = window.setInterval(
      () => void checkAndNotify(),
      60 * 60 * 1000,
    );
    return () => window.clearInterval(interval);
  }, [
    emailRemindersEnabled,
    emailProvider,
    emailAddress,
    emailRecipient,
    subscriptions,
  ]);
}
