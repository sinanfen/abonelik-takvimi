import { format, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DayData } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
    Banking: 'bg-category-banking/20 text-category-banking border-category-banking/30',
    Entertainment: 'bg-category-entertainment/20 text-category-entertainment border-category-entertainment/30',
    Bills: 'bg-category-bills/20 text-category-bills border-category-bills/30',
    SaaS: 'bg-category-saas/20 text-category-saas border-category-saas/30',
    Insurance: 'bg-category-insurance/20 text-category-insurance border-category-insurance/30',
    Shopping: 'bg-category-shopping/20 text-category-shopping border-category-shopping/30',
    Other: 'bg-category-other/20 text-category-other border-category-other/30',
};

interface DayCellProps {
    data: DayData;
    isSelected: boolean;
    onClick: () => void;
}

export function DayCell({ data, isSelected, onClick }: DayCellProps) {
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
                !isSelected && !today && 'border-border bg-card/30'
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
                        className={cn(
                            'truncate rounded-md border px-1.5 py-0.5 text-xs font-medium',
                            CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.Other
                        )}
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
