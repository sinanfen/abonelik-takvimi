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
    amount?: number;
    currency: string;
    paymentMethod?: string;
    reminders: number[];
    isActive: boolean;
    notes?: string;
    statementDay?: number;  // For credit cards
    dueDay?: number;        // For credit cards
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
    notes?: string;
    status?: 'planned' | 'done' | 'skipped';
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
