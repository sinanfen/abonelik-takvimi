// Subscription types
export type SubscriptionType = 'subscription' | 'credit_card' | 'bill' | 'other';

export type Category =
    | 'Banking'
    | 'Entertainment'
    | 'Bills'
    | 'SaaS'
    | 'Insurance'
    | 'Shopping'
    | 'Housing'
    | 'Utilities'
    | 'Telecom'
    | 'Transportation'
    | 'Health'
    | 'Education'
    | 'Food'
    | 'Other';

export type RecurrenceType = 'recurring' | 'one_time';
export type AmountMode = 'fixed' | 'variable';
export type PaymentMode = 'manual' | 'automatic';
export type PaymentStatus = 'planned' | 'done' | 'skipped';

export type EventKind = 'payment' | 'statement' | 'due' | 'reminder';

export interface RecurrenceRule {
    frequency: 'monthly' | 'weekly' | 'yearly' | 'custom';
    dayOfMonth?: number;
    weeklyDays?: string[];
    timezone?: string;
}

export interface Subscription {
    id: string;
    name: string;
    type: SubscriptionType;
    category: Category;
    recurrence: RecurrenceRule;
    recurrenceType: RecurrenceType;
    paymentMode: PaymentMode;
    amountMode: AmountMode;
    amount?: number;
    currency: string;
    paymentMethod?: string;
    reminders: number[];
    isActive: boolean;
    notes?: string;
    statementDay?: number; // For credit cards
    dueDay?: number; // For credit cards
    startDate?: Date;
    endDate?: Date;
    createdAt: Date;
    updatedAt: Date;
    sortOrder?: number;
}

export interface SubscriptionEvent {
    id: string;
    subscriptionId: string;
    date: Date;
    kind: EventKind;
    title: string;
    category: Category;
    amount?: number;
    currency: string;
    subscriptionType: SubscriptionType;
    amountMode?: AmountMode;
    scheduledDate?: Date;
    amountOverridden?: boolean;
    dateOverridden?: boolean;
    notes?: string;
    status?: PaymentStatus;
    sortOrder?: number;
}

export interface MonthlySnapshot {
    id: string;
    month: string;
    items: SubscriptionEvent[];
    createdAt: Date;
    updatedAt: Date;
}

export interface DayData {
    date: Date;
    events: SubscriptionEvent[];
}
