import { nanoid } from 'nanoid';
import { getDatabase } from '@/lib/database';
import type { Subscription, SubscriptionType, Category } from '@/types';

// Database row interface
interface SubscriptionRow {
    id: string;
    name: string;
    type: SubscriptionType;
    category: Category;
    frequency: 'monthly' | 'weekly' | 'yearly' | 'custom';
    day_of_month: number | null;
    amount: number | null;
    currency: string;
    payment_method: string | null;
    reminders: string;
    is_active: number;
    notes: string | null;
    statement_day: number | null;
    due_day: number | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    updated_at: string;
}

// Convert database row to Subscription
function rowToSubscription(row: SubscriptionRow): Subscription {
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        category: row.category,
        recurrence: {
            frequency: row.frequency,
            dayOfMonth: row.day_of_month ?? undefined,
        },
        amount: row.amount ?? undefined,
        currency: row.currency,
        paymentMethod: row.payment_method ?? undefined,
        reminders: JSON.parse(row.reminders) as number[],
        isActive: row.is_active === 1,
        notes: row.notes ?? undefined,
        statementDay: row.statement_day ?? undefined,
        dueDay: row.due_day ?? undefined,
        startDate: row.start_date ? new Date(row.start_date) : undefined,
        endDate: row.end_date ? new Date(row.end_date) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

// Create subscription input
export interface CreateSubscriptionInput {
    name: string;
    type: SubscriptionType;
    category: Category;
    frequency: 'monthly' | 'weekly' | 'yearly' | 'custom';
    dayOfMonth?: number;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    reminders?: number[];
    notes?: string;
    statementDay?: number;
    dueDay?: number;
    startDate?: Date;
    endDate?: Date;
}

// Update subscription input
export interface UpdateSubscriptionInput extends Partial<CreateSubscriptionInput> {
    isActive?: boolean;
}

export const subscriptionRepository = {
    // Get all subscriptions
    async getAll(): Promise<Subscription[]> {
        const db = await getDatabase();
        const rows = await db.select<SubscriptionRow[]>(
            'SELECT * FROM subscriptions ORDER BY name ASC'
        );
        return rows.map(rowToSubscription);
    },

    // Get active subscriptions
    async getActive(): Promise<Subscription[]> {
        const db = await getDatabase();
        const rows = await db.select<SubscriptionRow[]>(
            'SELECT * FROM subscriptions WHERE is_active = 1 ORDER BY name ASC'
        );
        return rows.map(rowToSubscription);
    },

    // Get subscription by ID
    async getById(id: string): Promise<Subscription | null> {
        const db = await getDatabase();
        const rows = await db.select<SubscriptionRow[]>(
            'SELECT * FROM subscriptions WHERE id = ?',
            [id]
        );
        return rows.length > 0 ? rowToSubscription(rows[0]) : null;
    },

    // Create subscription
    async create(input: CreateSubscriptionInput): Promise<Subscription> {
        console.log('Creating subscription with input:', input);
        try {
            const db = await getDatabase();
            const id = nanoid();
            const now = new Date().toISOString();

            await db.execute(
                `INSERT INTO subscriptions (
            id, name, type, category, frequency, day_of_month,
            amount, currency, payment_method, reminders, 
            notes, statement_day, due_day, start_date, end_date,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    input.name,
                    input.type,
                    input.category,
                    input.frequency,
                    input.dayOfMonth ?? null,
                    input.amount ?? null,
                    input.currency ?? 'TRY',
                    input.paymentMethod ?? null,
                    JSON.stringify(input.reminders ?? [1]),
                    input.notes ?? null,
                    input.statementDay ?? null,
                    input.dueDay ?? null,
                    input.startDate?.toISOString() ?? null,
                    input.endDate?.toISOString() ?? null,
                    now,
                    now,
                ]
            );

            console.log('Subscription inserted into DB, fetching by ID:', id);
            const subscription = await this.getById(id);
            if (!subscription) {
                throw new Error('Failed to create subscription');
            }
            console.log('Subscription created successfully:', subscription);
            return subscription;
        } catch (error) {
            console.error('Error in repository.create:', error);
            throw error;
        }
    },

    // Update subscription
    async update(id: string, input: UpdateSubscriptionInput): Promise<Subscription> {
        const db = await getDatabase();
        const now = new Date().toISOString();

        const updates: string[] = [];
        const values: unknown[] = [];

        if (input.name !== undefined) {
            updates.push('name = ?');
            values.push(input.name);
        }
        if (input.type !== undefined) {
            updates.push('type = ?');
            values.push(input.type);
        }
        if (input.category !== undefined) {
            updates.push('category = ?');
            values.push(input.category);
        }
        if (input.frequency !== undefined) {
            updates.push('frequency = ?');
            values.push(input.frequency);
        }
        if (input.dayOfMonth !== undefined) {
            updates.push('day_of_month = ?');
            values.push(input.dayOfMonth);
        }
        if (input.amount !== undefined) {
            updates.push('amount = ?');
            values.push(input.amount);
        }
        if (input.currency !== undefined) {
            updates.push('currency = ?');
            values.push(input.currency);
        }
        if (input.paymentMethod !== undefined) {
            updates.push('payment_method = ?');
            values.push(input.paymentMethod);
        }
        if (input.reminders !== undefined) {
            updates.push('reminders = ?');
            values.push(JSON.stringify(input.reminders));
        }
        if (input.notes !== undefined) {
            updates.push('notes = ?');
            values.push(input.notes);
        }
        if (input.isActive !== undefined) {
            updates.push('is_active = ?');
            values.push(input.isActive ? 1 : 0);
        }
        if (input.statementDay !== undefined) {
            updates.push('statement_day = ?');
            values.push(input.statementDay);
        }
        if (input.dueDay !== undefined) {
            updates.push('due_day = ?');
            values.push(input.dueDay);
        }
        if (input.startDate !== undefined) {
            updates.push('start_date = ?');
            values.push(input.startDate?.toISOString() ?? null);
        }
        if (input.endDate !== undefined) {
            updates.push('end_date = ?');
            values.push(input.endDate?.toISOString() ?? null);
        }

        updates.push('updated_at = ?');
        values.push(now);
        values.push(id);

        await db.execute(
            `UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        const subscription = await this.getById(id);
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        return subscription;
    },

    // Toggle active status
    async toggleActive(id: string): Promise<Subscription> {
        const subscription = await this.getById(id);
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        return this.update(id, { isActive: !subscription.isActive });
    },

    // Delete subscription
    async delete(id: string): Promise<void> {
        const db = await getDatabase();
        await db.execute('DELETE FROM subscriptions WHERE id = ?', [id]);
    },

    // Search subscriptions
    async search(query: string): Promise<Subscription[]> {
        const db = await getDatabase();
        const rows = await db.select<SubscriptionRow[]>(
            'SELECT * FROM subscriptions WHERE name LIKE ? ORDER BY name ASC',
            [`%${query}%`]
        );
        return rows.map(rowToSubscription);
    },

    // Get subscriptions by category
    async getByCategory(category: Category): Promise<Subscription[]> {
        const db = await getDatabase();
        const rows = await db.select<SubscriptionRow[]>(
            'SELECT * FROM subscriptions WHERE category = ? AND is_active = 1 ORDER BY name ASC',
            [category]
        );
        return rows.map(rowToSubscription);
    },
};
