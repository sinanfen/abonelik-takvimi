// Subscription types
export type SubscriptionType = 'subscription' | 'credit_card' | 'bill' | 'other';

export type Category =
    | 'Banking'
    | 'Entertainment'
    | 'Bills'
    | 'SaaS'
    | 'Insurance'
    | 'Shopping'
    | 'Other';

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
}

export interface SubscriptionEvent {
    id: string;
    subscriptionId: string;
    date: Date;
    kind: EventKind;
    title: string;
    category: Category;
    amount?: number;
    status?: 'planned' | 'done' | 'skipped';
}

export interface DayData {
    date: Date;
    events: SubscriptionEvent[];
}
