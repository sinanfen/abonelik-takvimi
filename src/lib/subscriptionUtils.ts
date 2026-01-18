import { isSameDay, subDays, addMonths, setDate, startOfDay } from 'date-fns';
import { type Subscription } from '@/types'; // Type import

export function isReminderDue(subscription: Subscription): boolean {
    if (!subscription.reminders || subscription.reminders.length === 0) return false;

    const today = startOfDay(new Date());
    const dayOfMonth = subscription.recurrence?.dayOfMonth || 1;

    // Basit Aylık Hesaplama (Varsayım: Her ayın 'dayOfMonth' günü)
    // Bugünün ayı içindeki o gün
    let nextPaymentDate = setDate(new Date(), dayOfMonth);
    nextPaymentDate = startOfDay(nextPaymentDate);

    // Eğer o gün geçtiyse, bir sonraki ay
    if (nextPaymentDate < today) {
        nextPaymentDate = addMonths(nextPaymentDate, 1);
    }

    // Yıllık abonelikler için daha kompleks logic gerekebilir (StartDate vs.)
    // Ancak mevcut veri yapısında sadece dayOfMonth var.
    // Şimdilik her ay kontrol edilecek.

    // Hatırlatma günlerini kontrol et
    return subscription.reminders.some((daysBefore: number) => {
        const reminderDate = subDays(nextPaymentDate, daysBefore);
        return isSameDay(today, reminderDate);
    });
}
