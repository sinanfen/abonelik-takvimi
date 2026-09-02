import { useState } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    X,
    Plus,
    CreditCard,
    Receipt,
    Bell,
    Banknote,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    Circle,
    Ban,
    Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { DayData, PaymentStatus, SubscriptionEvent } from '@/types';
import { useMoveSubscription } from '@/features/subscriptions';
import { categories } from '@/features/subscriptions/schema';
import { useUpdateSnapshotItemStatus } from '@/features/snapshots';

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

const CATEGORY_COLORS = new Map(categories.map((category) => [category.value, category.color]));
const CATEGORY_LABELS = new Map(categories.map((category) => [category.value, category.label]));

function eventIdentity(event: SubscriptionEvent): string {
    return `${event.subscriptionId}|${event.kind}|${event.date.toISOString()}`;
}

interface DayDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    dayData: DayData | null;
    onNewSubscription?: () => void;
    isReadOnly?: boolean;
    canUpdateStatus?: boolean;
}

export function DayDrawer({
    isOpen,
    onClose,
    dayData,
    onNewSubscription,
    isReadOnly = false,
    canUpdateStatus = false,
}: DayDrawerProps) {
    const moveSubscription = useMoveSubscription();
    const updateStatus = useUpdateSnapshotItemStatus();
    const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);

    const sortedEvents = [...(dayData?.events ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const selectedEvent = sortedEvents.find((event) => eventIdentity(event) === selectedEventKey) ?? null;

    const handleDrawerClose = () => {
        setSelectedEventKey(null);
        onClose();
    };

    const handleMove = async (event: SubscriptionEvent, direction: 'up' | 'down') => {
        // Find index in VISIBLE list
        const currentIndex = sortedEvents.findIndex((e) => e.id === event.id);
        if (currentIndex === -1) return;

        // Determine target in VISIBLE list
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= sortedEvents.length) return;

        const targetEvent = sortedEvents[targetIndex];

        try {
            await moveSubscription.mutateAsync({
                id: event.subscriptionId,
                targetId: targetEvent.subscriptionId,
                position: direction === 'up' ? 'before' : 'after',
            });
        } catch (error) {
            console.error('Failed to move', error);
        }
    };

    const handleStatus = async (event: SubscriptionEvent, status: PaymentStatus) => {
        try {
            await updateStatus.mutateAsync({ itemId: event.id, status });
        } catch (error) {
            console.error('Ödeme durumu güncellenemedi:', error);
        }
    };

    if (!isOpen || !dayData) return null;

    const { date } = dayData;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={handleDrawerClose} />

            {/* Drawer */}
            <div className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col border-l border-border bg-background shadow-2xl animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            {format(date, 'd MMMM yyyy', { locale: tr })}
                        </h2>
                        <p className="text-sm text-muted-foreground">{format(date, 'EEEE', { locale: tr })}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleDrawerClose}>
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
                            <p className="mt-4 text-sm text-muted-foreground">Bu gün için kayıt yok</p>
                            {!isReadOnly && (
                                <Button className="mt-4" size="sm" onClick={onNewSubscription}>
                                    <Plus className="h-4 w-4" />
                                    Yeni Ekle
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedEvents.map((event, index) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onMoveUp={!isReadOnly && index > 0 ? () => handleMove(event, 'up') : undefined}
                                    onMoveDown={
                                        !isReadOnly && index < sortedEvents.length - 1
                                            ? () => handleMove(event, 'down')
                                            : undefined
                                    }
                                    isUpdating={moveSubscription.isPending}
                                    onOpenDetails={() => setSelectedEventKey(eventIdentity(event))}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {sortedEvents.length > 0 && !isReadOnly && (
                    <div className="border-t border-border p-4">
                        <Button className="w-full" onClick={onNewSubscription}>
                            <Plus className="h-4 w-4" />
                            Hızlı Ekle
                        </Button>
                    </div>
                )}
            </div>

            <EventDetailDialog
                event={selectedEvent}
                canUpdateStatus={canUpdateStatus}
                isUpdating={updateStatus.isPending}
                onClose={() => setSelectedEventKey(null)}
                onStatusChange={handleStatus}
            />
        </>
    );
}

interface EventCardProps {
    event: SubscriptionEvent;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    isUpdating?: boolean;
    onOpenDetails: () => void;
}

function EventCard({ event, onMoveUp, onMoveDown, isUpdating, onOpenDetails }: EventCardProps) {
    const tracksPayment = event.kind === 'payment' || event.kind === 'due';
    return (
        <div
            className={cn(
                'group relative rounded-xl border border-border bg-card p-4 transition-colors hover:bg-card/80',
                event.status === 'done' && 'border-emerald-500/40',
            )}
        >
            {/* Reorder Buttons (Visible on Hover or always visible?) */}
            {/* To make it clean, let's put them on the right side or valid position */}
            {(onMoveUp || onMoveDown) && (
                <div className="absolute -left-3 top-1/2 flex -translate-y-1/2 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveUp?.();
                        }}
                        disabled={!onMoveUp || isUpdating}
                    >
                        <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveDown?.();
                        }}
                        disabled={!onMoveDown || isUpdating}
                    >
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                </div>
            )}

            <div className="flex items-start justify-between pl-2">
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"
                        style={{ color: CATEGORY_COLORS.get(event.category) ?? '#94A3B8' }}
                    >
                        {KIND_ICONS[event.kind]}
                    </div>
                    <div>
                        <h3 className="font-medium text-foreground">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                            {KIND_LABELS[event.kind]} • {CATEGORY_LABELS.get(event.category) ?? event.category}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    {event.amount !== undefined && (
                        <span className="font-semibold text-foreground">
                            {new Intl.NumberFormat('tr-TR', {
                                style: 'currency',
                                currency: event.currency,
                            }).format(event.amount)}
                        </span>
                    )}
                    {tracksPayment && <PaymentStatusBadge status={event.status ?? 'planned'} />}
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={onOpenDetails}>
                        <Info className="h-3.5 w-3.5" />
                        Detay
                    </Button>
                </div>
            </div>
        </div>
    );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
    if (status === 'done') {
        return (
            <Badge className="gap-1 border-emerald-500/30 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ödendi
            </Badge>
        );
    }
    if (status === 'skipped') {
        return (
            <Badge variant="secondary" className="gap-1 text-muted-foreground">
                <Ban className="h-3.5 w-3.5" /> Atlandı
            </Badge>
        );
    }
    return (
        <Badge className="gap-1 border-amber-500/30 bg-amber-500/15 text-amber-500 hover:bg-amber-500/15">
            <Circle className="h-3.5 w-3.5" /> Ödenmedi
        </Badge>
    );
}

interface EventDetailDialogProps {
    event: SubscriptionEvent | null;
    canUpdateStatus: boolean;
    isUpdating: boolean;
    onClose: () => void;
    onStatusChange: (event: SubscriptionEvent, status: PaymentStatus) => Promise<void>;
}

function EventDetailDialog({ event, canUpdateStatus, isUpdating, onClose, onStatusChange }: EventDetailDialogProps) {
    if (!event) return null;
    const tracksPayment = event.kind === 'payment' || event.kind === 'due';

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-4 pr-8">
                        <div>
                            <DialogTitle>{event.title}</DialogTitle>
                            <DialogDescription className="mt-1">
                                {format(event.date, 'd MMMM yyyy, EEEE', { locale: tr })}
                            </DialogDescription>
                        </div>
                        {tracksPayment && <PaymentStatusBadge status={event.status ?? 'planned'} />}
                    </div>
                </DialogHeader>

                <div className="grid gap-3 py-2 sm:grid-cols-2">
                    <DetailItem label="İşlem türü" value={KIND_LABELS[event.kind]} />
                    <DetailItem label="Kategori" value={CATEGORY_LABELS.get(event.category) ?? event.category} />
                    <DetailItem
                        label="Tutar"
                        value={
                            event.amount === undefined
                                ? 'Belirtilmedi'
                                : new Intl.NumberFormat('tr-TR', {
                                      style: 'currency',
                                      currency: event.currency,
                                  }).format(event.amount)
                        }
                    />
                    <DetailItem label="Para birimi" value={event.currency} />
                    {event.notes && (
                        <div className="rounded-lg border border-border bg-secondary/30 p-3 sm:col-span-2">
                            <p className="text-xs font-medium text-muted-foreground">Notlar</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{event.notes}</p>
                        </div>
                    )}
                </div>

                {tracksPayment && canUpdateStatus && (
                    <DialogFooter className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:space-x-0">
                        <Button
                            type="button"
                            variant={event.status === 'planned' ? 'default' : 'outline'}
                            onClick={() => void onStatusChange(event, 'planned')}
                            disabled={isUpdating}
                        >
                            <Circle className="h-4 w-4" /> Ödenmedi
                        </Button>
                        <Button
                            type="button"
                            variant={event.status === 'done' ? 'default' : 'outline'}
                            className={cn(event.status === 'done' && 'bg-emerald-600 hover:bg-emerald-700')}
                            onClick={() => void onStatusChange(event, 'done')}
                            disabled={isUpdating}
                        >
                            <CheckCircle2 className="h-4 w-4" /> Ödendi
                        </Button>
                        <Button
                            type="button"
                            variant={event.status === 'skipped' ? 'secondary' : 'outline'}
                            onClick={() => void onStatusChange(event, 'skipped')}
                            disabled={isUpdating}
                        >
                            <Ban className="h-4 w-4" /> Atlandı
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
        </div>
    );
}
