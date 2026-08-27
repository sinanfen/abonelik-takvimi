import { format, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DayData } from '@/types';
import { categories } from '@/features/subscriptions/schema';

const CATEGORY_COLORS = new Map(categories.map((category) => [category.value, category.color]));

interface DayCellProps {
    data: DayData;
    isSelected: boolean;
    onClick: () => void;
    isCurrentMonth?: boolean;
}

export function DayCell({ data, isSelected, onClick, isCurrentMonth = true }: DayCellProps) {
    const { date, events } = data;
    const today = isToday(date);
    const displayEvents = events.slice(0, 3);
    const remaining = events.length - 3;

    return (
        <button
            onClick={onClick}
            className={cn(
                'group relative flex h-28 flex-col rounded-xl border p-2 text-left transition-all',
                'hover:border-primary/50 hover:bg-card/50',
                today && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                isSelected && 'border-primary bg-card',
                !isSelected && !today && 'border-border bg-card/30',
                !isCurrentMonth && 'opacity-40 grayscale'
            )}
        >
            {/* Date header */}
            <div className="flex items-center justify-between">
                <span
                    className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg text-sm font-medium',
                        today && 'bg-primary text-primary-foreground',
                        isSelected && !today && 'bg-secondary text-foreground',
                        !today && !isSelected && 'text-foreground'
                    )}
                >
                    {format(date, 'd')}
                </span>
                <span className="text-xs text-muted-foreground">
                    {format(date, 'EEE', { locale: tr })}
                </span>
            </div>

            {/* Events */}
            <div className="mt-1 flex flex-1 flex-col gap-0.5 overflow-hidden">
                {displayEvents.map((event) => (
                    <div
                        key={event.id}
                        className="truncate rounded-md border px-1.5 py-0.5 text-xs font-medium"
                        style={{
                            color: CATEGORY_COLORS.get(event.category) ?? '#94A3B8',
                            borderColor: `${CATEGORY_COLORS.get(event.category) ?? '#94A3B8'}55`,
                            backgroundColor: `${CATEGORY_COLORS.get(event.category) ?? '#94A3B8'}20`,
                        }}
                    >
                        {event.title}
                    </div>
                ))}
                {remaining > 0 && (
                    <span className="text-xs text-muted-foreground">+{remaining} daha</span>
                )}
            </div>
        </button>
    );
}
