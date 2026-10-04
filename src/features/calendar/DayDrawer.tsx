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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useUpdateSnapshotItemStatus, useUpdateSnapshotItemDetails } from '@/features/snapshots';
import { toDateKey, toMonthKey } from '@/features/snapshots/logic';

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
    return event.id;
}

interface DayDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    dayData: DayData | null;
    onNewSubscription?: () => void;
    isReadOnly?: boolean;
    canUpdateStatus?: boolean;
    canEditDetails?: boolean;
    detailEvents?: SubscriptionEvent[];
    onEventDateChange?: (date: Date) => void;
}

export function DayDrawer({
    isOpen,
    onClose,
    dayData,
    onNewSubscription,
    isReadOnly = false,
    canUpdateStatus = false,
    canEditDetails = false,
    detailEvents,
    onEventDateChange,
}: DayDrawerProps) {
    const moveSubscription = useMoveSubscription();
    const updateStatus = useUpdateSnapshotItemStatus();
    const updateDetails = useUpdateSnapshotItemDetails();
    const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);

    const sortedEvents = [...(dayData?.events ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const selectedEvent =
        (detailEvents ?? sortedEvents).find((event) => eventIdentity(event) === selectedEventKey) ?? null;

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
        await updateStatus.mutateAsync({ itemId: event.id, status });
    };

    const handleDetails = async (event: SubscriptionEvent, amount: number | null, date: string) => {
        await updateDetails.mutateAsync({ itemId: event.id, amount, date });
        onEventDateChange?.(new Date(`${date}T12:00:00`));
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
                {sortedEvents.length > 0 && (
                    <div className="border-t border-border p-4">
                        <Button className="w-full" onClick={onNewSubscription}>
                            <Plus className="h-4 w-4" />
                            Hızlı Ekle
                        </Button>
                    </div>
                )}
            </div>

            <EventDetailDialog
                key={selectedEvent?.id}
                event={selectedEvent}
                canUpdateStatus={canUpdateStatus}
                canEditDetails={canEditDetails}
                isUpdating={updateStatus.isPending || updateDetails.isPending}
                onClose={() => setSelectedEventKey(null)}
                onStatusChange={handleStatus}
                onDetailsSave={handleDetails}
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

            <div className="flex items-start justify-between gap-3 pl-2">
                <div className="flex min-w-0 items-center gap-3">
                    <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary"
                        style={{ color: CATEGORY_COLORS.get(event.category) ?? '#94A3B8' }}
                    >
                        {KIND_ICONS[event.kind]}
                    </div>
                    <div className="min-w-0">
                        <h3 className="break-words font-medium text-foreground">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                            {KIND_LABELS[event.kind]} • {CATEGORY_LABELS.get(event.category) ?? event.category}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                    {event.amount !== undefined && (
                        <span className="font-semibold text-foreground">
                            {new Intl.NumberFormat('tr-TR', {
                                style: 'currency',
                                currency: event.currency,
                            }).format(event.amount)}
                        </span>
                    )}
                    {tracksPayment &&
                        event.amountMode === 'variable' &&
                        event.status !== 'skipped' &&
                        event.amount === undefined && (
                            <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                                Tutar bekleniyor
                            </Badge>
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
    canEditDetails: boolean;
    isUpdating: boolean;
    onClose: () => void;
    onStatusChange: (event: SubscriptionEvent, status: PaymentStatus) => Promise<void>;
    onDetailsSave: (event: SubscriptionEvent, amount: number | null, date: string) => Promise<void>;
}

function EventDetailDialog({
    event,
    canUpdateStatus,
    canEditDetails,
    isUpdating,
    onClose,
    onStatusChange,
    onDetailsSave,
}: EventDetailDialogProps) {
    const [amount, setAmount] = useState(event?.amount?.toString() ?? '');
    const [date, setDate] = useState(event ? toDateKey(event.date) : '');
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    if (!event) return null;
    const tracksPayment = event.kind === 'payment' || event.kind === 'due';
    const month = toMonthKey(event.date);
    const lastDate = toDateKey(new Date(event.date.getFullYear(), event.date.getMonth() + 1, 0));
    const dirty = amount !== (event.amount?.toString() ?? '') || date !== toDateKey(event.date);
    const missingAmount =
        event.amountMode === 'variable' && (canEditDetails ? amount.trim() === '' : event.amount === undefined);
    const saveDetails = async () => {
        const parsed = amount.trim() === '' ? null : Number(amount);
        if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) throw new Error('Geçerli bir tutar girin.');
        await onDetailsSave(event, parsed, date);
    };
    const runAction = async (action: () => Promise<void>, success: string) => {
        setBusy(true);
        setMessage(null);
        try {
            await action();
            setMessage(success);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    };
    const changeStatus = (status: PaymentStatus) =>
        runAction(async () => {
            if (status === 'done' && canEditDetails && dirty) await saveDetails();
            await onStatusChange(event, status);
        }, 'Ödeme durumu kaydedildi.');

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
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

                {tracksPayment && canEditDetails && (
                    <form
                        className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void runAction(saveDetails, 'Bu dönemin tutarı ve tarihi kaydedildi.');
                        }}
                    >
                        <p className="text-sm font-medium">Bu dönemin ödemesi</p>
                        <p className="text-xs text-muted-foreground">
                            {event.amountMode === 'variable'
                                ? 'Tutarı bu dönem için girin. Sonraki dönem yeniden tutar bekler.'
                                : 'Buradaki değişiklik yalnızca bu döneme uygulanır. Sürekli fiyat değişikliği için Yönetim’den kaydı düzenleyin.'}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="occurrence-amount">Tutar · {event.currency}</Label>
                                <Input
                                    id="occurrence-amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={amount}
                                    placeholder="Tutar girin"
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="occurrence-date">Ödeme tarihi</Label>
                                <Input
                                    id="occurrence-date"
                                    type="date"
                                    required
                                    min={`${month}-01`}
                                    max={lastDate}
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" size="sm" disabled={isUpdating || busy || !dirty}>
                                Bu dönemi kaydet
                            </Button>
                        </div>
                    </form>
                )}
                {missingAmount && (
                    <p className="text-xs text-amber-500">
                        Ödendi olarak işaretlemek için önce dönemin tutarını girin. Fatura çıkmadıysa Atlandı
                        seçebilirsiniz.
                    </p>
                )}
                {message && (
                    <p role="status" className="text-sm text-muted-foreground">
                        {message}
                    </p>
                )}

                {tracksPayment && canUpdateStatus && (
                    <DialogFooter className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:space-x-0">
                        <Button
                            type="button"
                            variant={event.status === 'planned' ? 'default' : 'outline'}
                            onClick={() => void changeStatus('planned')}
                            disabled={isUpdating || busy}
                        >
                            <Circle className="h-4 w-4" /> Ödenmedi
                        </Button>
                        <Button
                            type="button"
                            variant={event.status === 'done' ? 'default' : 'outline'}
                            className={cn(event.status === 'done' && 'bg-emerald-600 hover:bg-emerald-700')}
                            onClick={() => void changeStatus('done')}
                            disabled={isUpdating || busy || missingAmount}
                        >
                            <CheckCircle2 className="h-4 w-4" /> Ödendi
                        </Button>
                        <Button
                            type="button"
                            variant={event.status === 'skipped' ? 'secondary' : 'outline'}
                            onClick={() => void changeStatus('skipped')}
                            disabled={isUpdating || busy}
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
