import { useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Subscription, Category } from '@/types';
import { PieChart as PieChartIcon, Wallet, CreditCard, BarChart3 } from 'lucide-react';

interface SummaryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    subscriptions: Subscription[];
}

const CATEGORY_LABELS: Record<Category, string> = {
    Banking: 'Bankacılık',
    Entertainment: 'Eğlence',
    Bills: 'Faturalar',
    SaaS: 'SaaS',
    Insurance: 'Sigorta',
    Shopping: 'Alışveriş',
    Other: 'Diğer',
};

const CATEGORY_COLORS: Record<Category, string> = {
    Banking: '#3b82f6', // blue-500
    Entertainment: '#a855f7', // purple-500
    Bills: '#ef4444', // red-500
    SaaS: '#6366f1', // indigo-500
    Insurance: '#22c55e', // green-500
    Shopping: '#ec4899', // pink-500
    Other: '#6b7280', // gray-500
};

export function SummaryDialog({ isOpen, onClose, subscriptions }: SummaryDialogProps) {
    const stats = useMemo(() => {
        const activeSubs = subscriptions.filter(sub => sub.isActive);
        const byCurrency: Record<string, { total: number; byCategory: Record<string, number> }> = {};

        activeSubs.forEach(sub => {
            if (!sub.amount) return;

            const currency = sub.currency || 'TRY';
            if (!byCurrency[currency]) {
                byCurrency[currency] = { total: 0, byCategory: {} };
            }

            // Calculate monthly cost
            let monthlyAmount = sub.amount;
            if (sub.recurrence.frequency === 'weekly') {
                monthlyAmount = sub.amount * 4.33;
            } else if (sub.recurrence.frequency === 'yearly') {
                monthlyAmount = sub.amount / 12;
            }

            // Add to totals
            byCurrency[currency].total += monthlyAmount;

            // Add to category
            const currentCatTotal = byCurrency[currency].byCategory[sub.category] || 0;
            byCurrency[currency].byCategory[sub.category] = currentCatTotal + monthlyAmount;
        });

        return byCurrency;
    }, [subscriptions]);

    const currencies = Object.keys(stats);

    const formatAmount = (amount: number, currency: string) => {
        const symbols: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
        return `${symbols[currency] || currency} ${amount.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    // Helper for Pie Chart Slices
    const getPieSlices = (data: Record<string, number>, total: number) => {
        let cumulativePercent = 0;
        return Object.entries(data)
            .sort(([, a], [, b]) => b - a)
            .map(([category, amount]) => {
                const percent = amount / total;
                const startX = Math.cos(2 * Math.PI * cumulativePercent);
                const startY = Math.sin(2 * Math.PI * cumulativePercent);
                cumulativePercent += percent;
                const endX = Math.cos(2 * Math.PI * cumulativePercent);
                const endY = Math.sin(2 * Math.PI * cumulativePercent);

                // For single item taking 100%
                if (percent === 1) {
                    return {
                        category,
                        path: `M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0`,
                        color: CATEGORY_COLORS[category as Category],
                        percent
                    };
                }

                const largeArcFlag = percent > 0.5 ? 1 : 0;
                const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                return {
                    category,
                    path: pathData,
                    color: CATEGORY_COLORS[category as Category],
                    percent
                };
            });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <BarChart3 className="h-6 w-6" />
                        Finansal Özet ve Rapor
                    </DialogTitle>
                    <DialogDescription>
                        Aktif aboneliklerinizin aylık ortalama maliyet analizi ve dağılımı.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1">
                    {currencies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <Wallet className="h-16 w-16 opacity-30 mb-4" />
                            <p className="text-lg font-medium">Analiz edilecek aktif veri bulunamadı.</p>
                            <p className="text-sm">Lütfen aktif abonelik ekleyin.</p>
                        </div>
                    ) : (
                        <div className="space-y-12 py-4">
                            {currencies.map(currency => {
                                const currencyData = stats[currency];
                                const sortedCategories = Object.entries(currencyData.byCategory).sort(([, a], [, b]) => b - a);
                                const maxAmount = sortedCategories[0]?.[1] || 1;
                                const pieSlices = getPieSlices(currencyData.byCategory, currencyData.total);

                                return (
                                    <div key={currency} className="space-y-6 animate-in fade-in duration-500">
                                        {/* Header Section */}
                                        <div className="flex items-center justify-between border-b pb-4">
                                            <div>
                                                <h3 className="text-2xl font-bold flex items-center gap-2">
                                                    {currency} <span className="text-muted-foreground text-lg font-normal">Raporu</span>
                                                </h3>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-muted-foreground">Toplam Aylık Ortalama</div>
                                                <div className="text-3xl font-bold text-primary">
                                                    {formatAmount(currencyData.total, currency)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Left Column: Bar Chart & List */}
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                                                    <h4 className="font-semibold text-lg">Harcama Kalemleri</h4>
                                                </div>

                                                <div className="space-y-3">
                                                    {sortedCategories.map(([category, amount]) => (
                                                        <div key={category} className="group relative">
                                                            <div className="flex items-center justify-between text-sm mb-1 z-10 relative">
                                                                <span className="font-medium flex items-center gap-2">
                                                                    <div
                                                                        className="w-3 h-3 rounded-full"
                                                                        style={{ backgroundColor: CATEGORY_COLORS[category as Category] }}
                                                                    />
                                                                    {CATEGORY_LABELS[category as Category]}
                                                                </span>
                                                                <span className="font-medium">{formatAmount(amount, currency)}</span>
                                                            </div>
                                                            <div className="h-3 w-full bg-secondary/30 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                                                    style={{
                                                                        width: `${(amount / maxAmount) * 100}%`,
                                                                        backgroundColor: CATEGORY_COLORS[category as Category]
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="text-xs text-muted-foreground text-right mt-0.5">
                                                                {((amount / currencyData.total) * 100).toFixed(1)}%
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Right Column: Pie Chart (Custom SVG) */}
                                            <div className="flex flex-col items-center justify-center p-4 bg-secondary/5 rounded-xl border border-secondary/20">
                                                <div className="flex items-center gap-2 mb-6 self-start">
                                                    <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                                                    <h4 className="font-semibold text-lg">Kategori Dağılımı</h4>
                                                </div>

                                                <div className="relative w-64 h-64 mb-6">
                                                    <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full -rotate-90 text-center">
                                                        {pieSlices.map((slice) => (
                                                            <path
                                                                key={slice.category}
                                                                d={slice.path}
                                                                fill={slice.color}
                                                                className="hover:opacity-80 transition-opacity cursor-pointer stroke-background stroke-[0.02]"
                                                            >
                                                                <title>{`${CATEGORY_LABELS[slice.category as Category]}: ${formatAmount(currencyData.byCategory[slice.category], currency)}`}</title>
                                                            </path>
                                                        ))}
                                                        {/* Center Hole for Donut Chart effect */}
                                                        <circle cx="0" cy="0" r="0.6" className="fill-background" />
                                                    </svg>

                                                    {/* Center Text */}
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                                                        <span className="text-xs text-muted-foreground font-medium">Toplam</span>
                                                        <span className="text-sm font-bold">{formatAmount(currencyData.total, currency)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap justify-center gap-3">
                                                    {sortedCategories.map(([category]) => (
                                                        <Badge
                                                            key={category}
                                                            variant="outline"
                                                            className="pl-1.5 pr-2 py-1 flex items-center gap-1.5 border-none bg-secondary/50"
                                                        >
                                                            <div
                                                                className="w-2 h-2 rounded-full"
                                                                style={{ backgroundColor: CATEGORY_COLORS[category as Category] }}
                                                            />
                                                            <span className="text-xs text-muted-foreground">
                                                                {CATEGORY_LABELS[category as Category]}
                                                            </span>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-border w-full my-8" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
