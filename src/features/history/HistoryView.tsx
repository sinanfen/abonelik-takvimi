import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Archive, CalendarDays, CheckCircle2, Clock3, Loader2, ReceiptText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { categories } from '@/features/subscriptions/schema';
import { toMonthKey, useSnapshotHistory } from '@/features/snapshots';
import type { Category, MonthlySnapshot } from '@/types';

const categoryMeta = new Map<Category, { label: string; color: string }>(
    categories.map((category) => [category.value, category]),
);

function monthLabel(month: string): string {
    return format(new Date(`${month}-01T12:00:00`), 'MMMM yyyy', { locale: tr });
}

function groupTotals(snapshot: MonthlySnapshot): [string, number][] {
    const totals = new Map<string, number>();
    for (const item of snapshot.items) {
        if (item.amount === undefined) continue;
        totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.amount);
    }
    return [...totals.entries()];
}

function formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
}

export function HistoryView() {
    const { data: snapshots = [], isLoading, error } = useSnapshotHistory();
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

    const selected = useMemo(
        () => snapshots.find((snapshot) => snapshot.month === selectedMonth) ?? snapshots[0] ?? null,
        [selectedMonth, snapshots],
    );
    const currentMonth = toMonthKey(new Date());
    const paymentItems = selected?.items.filter((item) => item.kind === 'payment' || item.kind === 'due') ?? [];
    const paidCount = paymentItems.filter((item) => item.status === 'done').length;
    const waitingCount = paymentItems.filter((item) => item.status === 'planned').length;

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center text-destructive">
                Geçmiş yüklenemedi: {String(error)}
            </div>
        );
    }

    if (snapshots.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Archive className="h-10 w-10 text-muted-foreground" />
                <div>
                    <h1 className="font-semibold">Henüz aylık snapshot yok</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Takvim açıldığında içinde bulunduğunuz ay otomatik olarak kaydedilir.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0">
            <aside className="w-72 shrink-0 overflow-auto border-r border-border bg-card/40 p-4">
                <div className="mb-4 flex items-center gap-2">
                    <Archive className="h-5 w-5 text-primary" />
                    <div>
                        <h1 className="font-semibold">Aylık Geçmiş</h1>
                        <p className="text-xs text-muted-foreground">{snapshots.length} snapshot</p>
                    </div>
                </div>
                <div className="space-y-2">
                    {snapshots.map((snapshot) => (
                        <button
                            key={snapshot.id}
                            type="button"
                            onClick={() => setSelectedMonth(snapshot.month)}
                            className={cn(
                                'w-full rounded-xl border px-3 py-3 text-left transition-colors',
                                selected?.month === snapshot.month
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border bg-card hover:bg-muted/60',
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium capitalize">{monthLabel(snapshot.month)}</span>
                                {snapshot.month === currentMonth && <Badge variant="secondary">Canlı</Badge>}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{snapshot.items.length} kayıt</p>
                        </button>
                    ))}
                </div>
            </aside>

            {selected && (
                <main className="flex-1 overflow-auto p-6">
                    <div className="mx-auto max-w-5xl space-y-6">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Aylık snapshot</p>
                                <h2 className="text-2xl font-semibold capitalize">{monthLabel(selected.month)}</h2>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Son güncelleme {format(selected.updatedAt, 'd MMM yyyy HH:mm', { locale: tr })}
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Kayıt sayısı
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-2xl font-semibold">{selected.items.length}</CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Ödendi
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-2xl font-semibold">{paidCount}</CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                        <Clock3 className="h-4 w-4 text-amber-500" /> Bekliyor
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-2xl font-semibold">{waitingCount}</CardContent>
                            </Card>
                            {groupTotals(selected).map(([currency, total]) => (
                                <Card key={currency}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Toplam · {currency}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-2xl font-semibold">
                                        {formatAmount(total, currency)}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ReceiptText className="h-5 w-5" />
                                    Ayın kayıtları
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {selected.items.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-muted-foreground">
                                        Bu ay için kayıt yok.
                                    </p>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {selected.items.map((item) => {
                                            const meta = categoryMeta.get(item.category);
                                            return (
                                                <div key={item.id} className="flex items-center gap-4 py-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                                        <CalendarDays
                                                            className="h-4 w-4"
                                                            style={{ color: meta?.color }}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">{item.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(item.date, 'd MMMM', { locale: tr })} ·{' '}
                                                            {meta?.label ?? item.category}
                                                        </p>
                                                    </div>
                                                    {item.amount !== undefined && (
                                                        <span className="text-sm font-semibold">
                                                            {formatAmount(item.amount, item.currency)}
                                                        </span>
                                                    )}
                                                    {(item.kind === 'payment' || item.kind === 'due') && (
                                                        <Badge
                                                            variant={
                                                                item.status === 'done'
                                                                    ? 'default'
                                                                    : item.status === 'skipped'
                                                                      ? 'secondary'
                                                                      : 'outline'
                                                            }
                                                            className={cn(
                                                                item.status === 'done' &&
                                                                    'bg-emerald-600 hover:bg-emerald-600',
                                                            )}
                                                        >
                                                            {item.status === 'done'
                                                                ? 'Ödendi'
                                                                : item.status === 'skipped'
                                                                  ? 'Atlandı'
                                                                  : 'Ödenmedi'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            )}
        </div>
    );
}
