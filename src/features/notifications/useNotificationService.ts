import { useEffect, useState } from 'react';
import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from '@tauri-apps/plugin-notification';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptions } from '@/features/subscriptions'; // Hook import
import { isReminderDue } from '@/lib/subscriptionUtils';

export function useNotificationService() {
    const { notificationsEnabled } = useSettingsStore();
    const { data: subscriptions } = useSubscriptions();
    const [permissionGranted, setPermissionGranted] = useState(false);

    // 1. İzin Kontrolü
    useEffect(() => {
        if (!notificationsEnabled) return;

        const checkPermission = async () => {
            try {
                let granted = await isPermissionGranted();
                if (!granted) {
                    const permission = await requestPermission();
                    granted = permission === 'granted';
                }
                setPermissionGranted(granted);
            } catch (error) {
                console.error('Notification permission check failed:', error);
            }
        };

        checkPermission();
    }, [notificationsEnabled]);

    // 2. Hatırlatma Kontrolü
    useEffect(() => {
        if (!notificationsEnabled || !permissionGranted || !subscriptions) return;

        const checkAndNotify = async () => {
            subscriptions.forEach(sub => {
                if (isReminderDue(sub)) {
                    // Tekrar eden bildirimleri engelle (local storage key: subId + date)
                    const todayStr = new Date().toDateString();
                    const key = `notified-${sub.id}-${todayStr}`;

                    if (localStorage.getItem(key)) return;

                    try {
                        sendNotification({
                            title: 'Ödeme Hatırlatması 🔔',
                            body: `${sub.name} için ödeme günü yaklaşıyor! (${sub.amount} ${sub.currency})`,
                        });

                        localStorage.setItem(key, 'true');
                    } catch (error) {
                        console.error('Failed to send notification:', error);
                    }
                }
            });
        };

        checkAndNotify(); // İlk yüklemede kontrol et
        const interval = setInterval(checkAndNotify, 60 * 60 * 1000); // 1 saatte bir kontrol (uygulama açıksa)

        return () => clearInterval(interval);
    }, [notificationsEnabled, permissionGranted, subscriptions]);
}
