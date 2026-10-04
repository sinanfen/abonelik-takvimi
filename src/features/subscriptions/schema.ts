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
    { value: 'Housing', label: 'Kira & Konut', color: '#F43F5E' },
    { value: 'Utilities', label: 'Elektrik, Su & Doğalgaz', color: '#EAB308' },
    { value: 'Telecom', label: 'İnternet & Telefon', color: '#06B6D4' },
    { value: 'Transportation', label: 'Ulaşım', color: '#14B8A6' },
    { value: 'Health', label: 'Sağlık', color: '#EC4899' },
    { value: 'Education', label: 'Eğitim', color: '#8B5CF6' },
    { value: 'Food', label: 'Market & Yemek', color: '#84CC16' },
    { value: 'Other', label: 'Diğer', color: '#94A3B8' },
] as const;

export const frequencies = [
    { value: 'monthly', label: 'Aylık' },
    { value: 'weekly', label: 'Haftalık' },
    { value: 'yearly', label: 'Yıllık' },
] as const;

export const recurrenceTypes = [
    { value: 'recurring', label: 'Tekrar eden' },
    { value: 'one_time', label: 'Tek seferlik' },
] as const;

export const paymentModes = [
    { value: 'manual', label: 'Manuel ödeme' },
    { value: 'automatic', label: 'Otomatik ödeme talimatı' },
] as const;

export const amountModes = [
    { value: 'fixed', label: 'Sabit tutar · her dönem aynı' },
    { value: 'variable', label: 'Değişken tutar · her dönem ben girerim' },
] as const;

export const reminderOptions = [
    { value: 7, label: '7 gün önce' },
    { value: 3, label: '3 gün önce' },
    { value: 1, label: '1 gün önce' },
    { value: 0, label: 'Aynı gün' },
] as const;

export const subscriptionFormSchema = z
    .object({
        name: z.string().min(1, 'Kayıt adı zorunludur'),
        type: z.enum(['subscription', 'credit_card', 'bill', 'other'], {
            required_error: 'Tür seçimi zorunludur',
        }),
        category: z.enum(
            [
                'Banking',
                'Entertainment',
                'Bills',
                'SaaS',
                'Insurance',
                'Shopping',
                'Housing',
                'Utilities',
                'Telecom',
                'Transportation',
                'Health',
                'Education',
                'Food',
                'Other',
            ],
            {
                required_error: 'Kategori seçimi zorunludur',
            },
        ),
        recurrenceType: z.enum(['recurring', 'one_time']).default('recurring'),
        paymentMode: z.enum(['manual', 'automatic']).default('manual'),
        amountMode: z.enum(['fixed', 'variable']).default('fixed'),
        frequency: z.enum(['monthly', 'weekly', 'yearly'], {
            required_error: 'Tekrar sıklığı seçimi zorunludur',
        }),
        dayOfMonth: z.coerce.number().min(1, 'Gün 1-31 arasında olmalı').max(31, 'Gün 1-31 arasında olmalı').optional(),
        amount: z.preprocess(
            (value) => (value === '' ? undefined : value),
            z.coerce.number().finite().min(0).optional(),
        ),
        currency: z.string().default('TRY'),
        paymentMethod: z.string().optional(),
        reminders: z.array(z.number()).default([1]),
        notes: z.string().optional(),
        startDate: z.string().min(1, 'Tarih zorunludur'),
        endDate: z.string().optional(),
        // Credit card specific fields
        statementDay: z.coerce.number().min(1).max(31).optional(),
        dueDay: z.coerce.number().min(1).max(31).optional(),
    })
    .superRefine((data, ctx) => {
        if (data.recurrenceType === 'recurring' && data.endDate && data.endDate < data.startDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['endDate'],
                message: 'Bitiş tarihi başlangıçtan önce olamaz',
            });
        }
    });

export type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

export function getDefaultFormValues(date = new Date()): Partial<SubscriptionFormData> {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
        type: 'subscription',
        category: 'Other',
        frequency: 'monthly',
        recurrenceType: 'recurring',
        paymentMode: 'manual',
        amountMode: 'fixed',
        dayOfMonth: date.getDate(),
        startDate: dateKey,
        currency: 'TRY',
        reminders: [1],
    };
}
