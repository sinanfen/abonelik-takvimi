import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { X, Plus, CreditCard, Receipt, Bell, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DayData, SubscriptionEvent } from '@/types';

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
    if (!isOpen || !dayData) return null;

    const { date, events } = dayData;

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
                    {events.length === 0 ? (
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
                            {events.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {events.length > 0 && (
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

function EventCard({ event }: { event: SubscriptionEvent }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-card/80">
            <div className="flex items-start justify-between">
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
