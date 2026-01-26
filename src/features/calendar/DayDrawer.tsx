import { useMemo } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { X, Plus, CreditCard, Receipt, Bell, Banknote, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DayData, SubscriptionEvent } from '@/types';
import { useMoveSubscription } from '@/features/subscriptions';

const KIND_ICONS: Record<string, React.ReactNode> = {
    payment: <Banknote className="h-4 w-4" />,
    statement: <Receipt className="h-4 w-4" />,
    due: <CreditCard className="h-4 w-4" />,
    reminder: <Bell className="h-4 w-4" />,
};

const KIND_LABELS: Record<string, string> = {
    payment: 'Ödeme',
    statement: 'Hesap Kesim',
    due: 'Son Ödeme',
    reminder: 'Hatırlatma',
};

const CATEGORY_COLORS: Record<string, string> = {
    Banking: 'text-category-banking',
    Entertainment: 'text-category-entertainment',
    Bills: 'text-category-bills',
    SaaS: 'text-category-saas',
    Insurance: 'text-category-insurance',
    Shopping: 'text-category-shopping',
    Other: 'text-category-other',
};

interface DayDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    dayData: DayData | null;
    onNewSubscription?: () => void;
}

export function DayDrawer({ isOpen, onClose, dayData, onNewSubscription }: DayDrawerProps) {
    const moveSubscription = useMoveSubscription();


    const sortedEvents = useMemo(() => {
        if (!dayData?.events) return [];
        return [...dayData.events].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }, [dayData?.events]);

    const handleMove = async (event: SubscriptionEvent, direction: 'up' | 'down') => {
        // Find index in VISIBLE list
        const currentIndex = sortedEvents.findIndex(e => e.id === event.id);
        if (currentIndex === -1) return;

        // Determine target in VISIBLE list
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= sortedEvents.length) return;

        const targetEvent = sortedEvents[targetIndex];

        try {
            await moveSubscription.mutateAsync({
                id: event.subscriptionId,
                targetId: targetEvent.subscriptionId,
                position: direction === 'up' ? 'before' : 'after'
            });
        } catch (error) {
            console.error("Failed to move", error);
        }
    };

    if (!isOpen || !dayData) return null;

    const { date } = dayData;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col border-l border-border bg-background shadow-2xl animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            {format(date, 'd MMMM yyyy', { locale: tr })}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {format(date, 'EEEE', { locale: tr })}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {sortedEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="rounded-full bg-secondary p-4">
                                <Receipt className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground">
                                Bu gün için kayıt yok
                            </p>
                            <Button className="mt-4" size="sm" onClick={onNewSubscription}>
                                <Plus className="h-4 w-4" />
                                Yeni Ekle
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedEvents.map((event, index) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onMoveUp={index > 0 ? () => handleMove(event, 'up') : undefined}
                                    onMoveDown={index < sortedEvents.length - 1 ? () => handleMove(event, 'down') : undefined}
                                    isUpdating={moveSubscription.isPending}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {sortedEvents.length > 0 && (
                    <div className="border-t border-border p-4">
                        <Button className="w-full" onClick={onNewSubscription}>
                            <Plus className="h-4 w-4" />
                            Hızlı Ekle
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}

interface EventCardProps {
    event: SubscriptionEvent;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    isUpdating?: boolean;
}

function EventCard({ event, onMoveUp, onMoveDown, isUpdating }: EventCardProps) {
    return (
        <div className="group relative rounded-xl border border-border bg-card p-4 transition-colors hover:bg-card/80">
            {/* Reorder Buttons (Visible on Hover or always visible?) */}
            {/* To make it clean, let's put them on the right side or valid position */}
            <div className="absolute -left-3 top-1/2 flex -translate-y-1/2 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
                    disabled={!onMoveUp || isUpdating}
                >
                    <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
                    disabled={!onMoveDown || isUpdating}
                >
                    <ChevronDown className="h-3 w-3" />
                </Button>
            </div>

            <div className="flex items-start justify-between pl-2">
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg bg-secondary',
                            CATEGORY_COLORS[event.category]
                        )}
                    >
                        {KIND_ICONS[event.kind]}
                    </div>
                    <div>
                        <h3 className="font-medium text-foreground">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                            {KIND_LABELS[event.kind]} • {event.category}
                        </p>
                    </div>
                </div>
                {event.amount && (
                    <span className="font-semibold text-foreground">
                        ₺{event.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                )}
            </div>
        </div>
    );
}
