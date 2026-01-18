import { z } from 'zod';

export const subscriptionTypes = [
    { value: 'subscription', label: 'Abonelik' },
    { value: 'credit_card', label: 'Kredi Kartı' },
    { value: 'bill', label: 'Fatura' },
    { value: 'other', label: 'Diğer' },
] as const;

export const categories = [
    { value: 'Banking', label: 'Bankacılık', color: '#60A5FA' },
    { value: 'Entertainment', label: 'Eğlence', color: '#A78BFA' },
    { value: 'Bills', label: 'Faturalar', color: '#FBBF24' },
    { value: 'SaaS', label: 'SaaS', color: '#34D399' },
    { value: 'Insurance', label: 'Sigorta', color: '#FB7185' },
    { value: 'Shopping', label: 'Alışveriş', color: '#F97316' },
    { value: 'Other', label: 'Diğer', color: '#94A3B8' },
] as const;

export const frequencies = [
    { value: 'monthly', label: 'Aylık' },
    { value: 'weekly', label: 'Haftalık' },
    { value: 'yearly', label: 'Yıllık' },
] as const;

export const reminderOptions = [
    { value: 7, label: '7 gün önce' },
    { value: 3, label: '3 gün önce' },
    { value: 1, label: '1 gün önce' },
    { value: 0, label: 'Aynı gün' },
] as const;

export const subscriptionFormSchema = z.object({
    name: z.string().min(1, 'Abonelik adı zorunludur'),
    type: z.enum(['subscription', 'credit_card', 'bill', 'other'], {
        required_error: 'Tür seçimi zorunludur',
    }),
    category: z.enum(['Banking', 'Entertainment', 'Bills', 'SaaS', 'Insurance', 'Shopping', 'Other'], {
        required_error: 'Kategori seçimi zorunludur',
    }),
    frequency: z.enum(['monthly', 'weekly', 'yearly'], {
        required_error: 'Tekrar sıklığı seçimi zorunludur',
    }),
    dayOfMonth: z.coerce
        .number()
        .min(1, 'Gün 1-31 arasında olmalı')
        .max(31, 'Gün 1-31 arasında olmalı')
        .optional(),
    amount: z.coerce.number().min(0).optional(),
    currency: z.string().default('TRY'),
    paymentMethod: z.string().optional(),
    reminders: z.array(z.number()).default([1]),
    notes: z.string().optional(),
    // Credit card specific fields
    statementDay: z.coerce.number().min(1).max(31).optional(),
    dueDay: z.coerce.number().min(1).max(31).optional(),
});

export type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

export const defaultFormValues: Partial<SubscriptionFormData> = {
    type: 'subscription',
    category: 'Other',
    frequency: 'monthly',
    dayOfMonth: new Date().getDate(),
    currency: 'TRY',
    reminders: [1],
};
