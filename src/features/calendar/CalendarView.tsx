import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backupService } from '@/lib/backup';
import {
    addDays,
    startOfToday,
    format,
    isSameDay,
    isToday,
    isBefore,
    getDate,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    Plus,
    Settings,
    Download,
    Upload,
    Search,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DayCell } from './DayCell';
import { DayDrawer } from './DayDrawer';
import { FilterSidebar, defaultFilters, type FilterState } from './FilterSidebar';
import { useActiveSubscriptions } from '@/features/subscriptions';
import type { DayData, SubscriptionEvent, Subscription } from '@/types';

// Generate events from subscriptions for a date range
function generateEventsForDateRange(
    subscriptions: Subscription[],
    startDate: Date,
    daysCount: number
): SubscriptionEvent[] {
    const events: SubscriptionEvent[] = [];
    const endDate = addDays(startDate, daysCount - 1);

    for (const sub of subscriptions) {
        if (!sub.isActive) continue;

        // For credit cards, generate both statement and due events
        if (sub.type === 'credit_card') {
            if (sub.statementDay) {
                // Generate statement events
                for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
                    if (getDate(d) === sub.statementDay) {
                        events.push({
                            id: `${sub.id}-statement-${d.toISOString()}`,
                            subscriptionId: sub.id,
                            date: new Date(d),
                            kind: 'statement',
                            title: `${sub.name} - Hesap Kesim`,
                            category: sub.category,
                        });
                    }
                }
            }
            if (sub.dueDay) {
                // Generate due events
                for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
                    if (getDate(d) === sub.dueDay) {
                        events.push({
                            id: `${sub.id}-due-${d.toISOString()}`,
                            subscriptionId: sub.id,
                            date: new Date(d),
                            kind: 'due',
                            title: `${sub.name} - Son Ödeme`,
                            category: sub.category,
                        });
                    }
                }
            }
        } else {
            // For regular subscriptions, generate payment events
            const dayOfMonth = sub.recurrence.dayOfMonth || 1;

            for (let month = startDate.getMonth() - 1; month <= endDate.getMonth() + 1; month++) {
                const year = startDate.getFullYear() + Math.floor(month / 12);
                const actualMonth = ((month % 12) + 12) % 12;

                // Handle month-end overflow (e.g., day 31 in February)
                const daysInMonth = new Date(year, actualMonth + 1, 0).getDate();
                const actualDay = Math.min(dayOfMonth, daysInMonth);

                const eventDate = new Date(year, actualMonth, actualDay);

                if (eventDate >= startDate && eventDate <= endDate) {
                    events.push({
                        id: `${sub.id}-payment-${eventDate.toISOString()}`,
                        subscriptionId: sub.id,
                        date: eventDate,
                        kind: 'payment',
                        title: sub.name,
                        category: sub.category,
                        amount: sub.amount,
                    });
                }
            }
        }
    }

    return events;
}

interface CalendarViewProps {
    onNewSubscription?: () => void;
    onOpenSettings?: () => void;
}

export function CalendarView({ onNewSubscription, onOpenSettings }: CalendarViewProps) {
    const [startDate, setStartDate] = useState(() => startOfToday());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<FilterState>(defaultFilters);
    const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const queryClient = useQueryClient();

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await backupService.exportData();
        } catch (error) {
            console.error('Export failed:', error);
            alert(`Yedekleme hatası: ${error}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async () => {
        setIsImporting(true);
        try {
            const success = await backupService.importData();
            if (success) {
                queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            }
        } catch (error) {
            console.error('Import failed:', error);
            alert(`Geri yükleme hatası: ${error}`);
        } finally {
            setIsImporting(false);
        }
    };

    // Get subscriptions from database
    const { data: subscriptions = [], isLoading } = useActiveSubscriptions();

    // Generate events from subscriptions
    const allEvents = useMemo(() => {
        return generateEventsForDateRange(subscriptions, startDate, 30);
    }, [subscriptions, startDate]);

    // Calculate days with filtered events
    const days = useMemo(() => {
        const today = startOfToday();
        const result: DayData[] = [];

        for (let i = 0; i < 30; i++) {
            const date = addDays(startDate, i);

            // Get events for this day
            let events = allEvents.filter((e) => isSameDay(e.date, date));

            // Apply category filter
            if (filters.categories.length > 0) {
                events = events.filter((e) => filters.categories.includes(e.category));
            }

            // Apply upcoming days filter
            if (filters.upcomingDays !== null) {
                const cutoffDate = addDays(today, filters.upcomingDays);
                if (isBefore(cutoffDate, date)) {
                    events = [];
                }
            }

            // Apply payments only filter
            if (filters.showPaymentsOnly) {
                events = events.filter((e) => e.kind === 'payment' || e.kind === 'due');
            }

            // Apply search filter
            if (searchQuery) {
                events = events.filter((e) =>
                    e.title.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            result.push({ date, events });
        }
        return result;
    }, [startDate, allEvents, filters, searchQuery]);

    const endDate = addDays(startDate, 29);

    const handlePrevious = () => {
        setStartDate((prev) => addDays(prev, -7));
    };

    const handleNext = () => {
        setStartDate((prev) => addDays(prev, 7));
    };

    const handleToday = () => {
        setStartDate(startOfToday());
    };

    const selectedDayData = selectedDate
        ? days.find((d) => isSameDay(d.date, selectedDate))
        : null;

    return (
        <div className="flex h-full flex-1">
            {/* Filter Sidebar */}
            <FilterSidebar
                filters={filters}
                onFiltersChange={setFilters}
                isCollapsed={isFilterCollapsed}
                onToggleCollapse={() => setIsFilterCollapsed(!isFilterCollapsed)}
            />

            <div className="flex flex-1 flex-col">
                {/* Header */}
                <header className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={handlePrevious}>
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleNext}>
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold text-foreground">
                                {format(startDate, 'd MMM', { locale: tr })} –{' '}
                                {format(endDate, 'd MMM yyyy', { locale: tr })}
                            </h1>
                            {!isToday(startDate) && (
                                <Button variant="outline" size="sm" onClick={handleToday}>
                                    Bugün
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="relative w-full max-w-[150px] sm:max-w-[200px] md:max-w-xs mx-2">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={onNewSubscription}>
                            <Plus className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Yeni Kayıt</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleImport} disabled={isImporting}>
                            <Upload className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleExport} disabled={isExporting}>
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onOpenSettings}>
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                </header>

                {/* Calendar Grid */}
                <main className="flex-1 overflow-auto p-6">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : subscriptions.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-4">
                            <p className="text-muted-foreground">
                                Henüz abonelik eklenmemiş. Başlamak için yeni bir abonelik ekleyin.
                            </p>
                            <Button onClick={onNewSubscription}>
                                <Plus className="h-4 w-4" />
                                İlk Aboneliği Ekle
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-6 gap-2">
                            {days.map((day) => (
                                <DayCell
                                    key={day.date.toISOString()}
                                    data={day}
                                    isSelected={selectedDate ? isSameDay(day.date, selectedDate) : false}
                                    onClick={() => setSelectedDate(day.date)}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Day Drawer */}
            <DayDrawer
                isOpen={selectedDate !== null}
                onClose={() => setSelectedDate(null)}
                dayData={selectedDayData ?? null}
                onNewSubscription={onNewSubscription}
            />
        </div>
    );
}
