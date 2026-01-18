import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { subscriptionRepository } from '@/features/subscriptions/repository';
import type { CreateSubscriptionInput } from '@/features/subscriptions/repository';
// import type { Subscription } from '@/types'; // Unused

export const backupService = {
    async exportData(): Promise<boolean> {
        try {
            const subscriptions = await subscriptionRepository.getAll();
            const data = JSON.stringify(subscriptions, null, 2);

            const filePath = await save({
                filters: [{
                    name: 'JSON',
                    extensions: ['json']
                }],
                defaultPath: 'abonelik-yedek.json',
            });

            if (filePath) {
                await writeTextFile(filePath, data);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Export error:', error);
            throw error;
        }
    },

    async importData(): Promise<boolean> {
        try {
            const filePath = await open({
                multiple: false,
                filters: [{
                    name: 'JSON',
                    extensions: ['json']
                }]
            });

            if (filePath && typeof filePath === 'string') {
                const content = await readTextFile(filePath);
                // JSON parse edince tarihler string kalır
                const rawSubscriptions = JSON.parse(content) as any[];

                for (const sub of rawSubscriptions) {
                    // Temel validation: En azından name ve type olmalı
                    if (!sub.name || !sub.type) continue;

                    const input: CreateSubscriptionInput = {
                        name: sub.name,
                        type: sub.type,
                        category: sub.category,
                        // recurrence objesinden alıyoruz
                        frequency: sub.recurrence?.frequency || 'monthly',
                        dayOfMonth: sub.recurrence?.dayOfMonth,
                        amount: sub.amount,
                        currency: sub.currency,
                        paymentMethod: sub.paymentMethod,
                        reminders: sub.reminders,
                        notes: sub.notes,
                        statementDay: sub.statementDay,
                        dueDay: sub.dueDay,
                        startDate: sub.startDate ? new Date(sub.startDate) : undefined,
                        endDate: sub.endDate ? new Date(sub.endDate) : undefined,
                    };

                    try {
                        const created = await subscriptionRepository.create(input);

                        // Eğer import edilen veri pasifse, yeni kaydı da pasife çek
                        if (sub.isActive === false) {
                            await subscriptionRepository.update(created.id, { isActive: false });
                        }
                    } catch (err) {
                        console.error(`Failed to import subscription ${sub.name}:`, err);
                        // Bir hata olsa bile diğerlerini import etmeye devam et
                    }
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    }
};
