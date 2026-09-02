import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { subscriptionRepository } from '@/features/subscriptions/repository';
import type { CreateSubscriptionInput } from '@/features/subscriptions/repository';
import { snapshotRepository } from '@/features/snapshots';
import type { MonthlySnapshot, Subscription } from '@/types';

interface BackupPayload {
    version: 2 | 3;
    exportedAt: string;
    subscriptions: Subscription[];
    snapshots: MonthlySnapshot[];
}

export const backupService = {
    async exportData(): Promise<boolean> {
        try {
            const subscriptions = await subscriptionRepository.getAll();
            const snapshots = await snapshotRepository.getAll();
            const payload: BackupPayload = {
                version: 3,
                exportedAt: new Date().toISOString(),
                subscriptions,
                snapshots,
            };
            const data = JSON.stringify(payload, null, 2);

            const filePath = await save({
                filters: [
                    {
                        name: 'JSON',
                        extensions: ['json'],
                    },
                ],
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
                filters: [
                    {
                        name: 'JSON',
                        extensions: ['json'],
                    },
                ],
            });

            if (filePath && typeof filePath === 'string') {
                const content = await readTextFile(filePath);
                const parsed = JSON.parse(content) as BackupPayload | Subscription[];
                const rawSubscriptions = Array.isArray(parsed) ? parsed : parsed.subscriptions;
                const rawSnapshots = Array.isArray(parsed) ? [] : (parsed.snapshots ?? []);
                const idMap = new Map<string, string>();

                for (const sub of rawSubscriptions) {
                    // Temel validation: En azından name ve type olmalı
                    if (!sub.name || !sub.type) continue;

                    const input: CreateSubscriptionInput = {
                        name: sub.name,
                        type: sub.type,
                        category: sub.category,
                        // recurrence objesinden alıyoruz
                        frequency: sub.recurrence?.frequency || 'monthly',
                        recurrenceType: sub.recurrenceType ?? 'recurring',
                        paymentMode: sub.paymentMode ?? 'manual',
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
                        idMap.set(sub.id, created.id);

                        // Eğer import edilen veri pasifse, yeni kaydı da pasife çek
                        if (sub.isActive === false) {
                            await subscriptionRepository.update(created.id, {
                                isActive: false,
                            });
                        }
                    } catch (err) {
                        console.error(`Failed to import subscription ${sub.name}:`, err);
                        // Bir hata olsa bile diğerlerini import etmeye devam et
                    }
                }

                if (rawSnapshots.length > 0) {
                    const hydratedSnapshots: MonthlySnapshot[] = rawSnapshots.map((snapshot) => ({
                        ...snapshot,
                        createdAt: new Date(snapshot.createdAt),
                        updatedAt: new Date(snapshot.updatedAt),
                        items: snapshot.items.map((item) => ({
                            ...item,
                            subscriptionId: idMap.get(item.subscriptionId) ?? item.subscriptionId,
                            date: new Date(item.date),
                        })),
                    }));
                    await snapshotRepository.replaceAll(hydratedSnapshots);
                }
                await snapshotRepository.refreshRollingSnapshots();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    },
};
