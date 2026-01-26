import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backupService } from '@/lib/backup';
import {
    addDays,
    startOfToday,
    format,
    isSameDay,
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
import type { SubscriptionEvent, Subscription } from '@/types';

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
                            sortOrder: sub.sortOrder,
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
                            sortOrder: sub.sortOrder,
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
                        sortOrder: sub.sortOrder,
                    });
                }
            }
        }
    }

    return events.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

interface CalendarViewProps {
    onNewSubscription?: () => void;
    onOpenSettings?: () => void;
}

export function CalendarView({ onNewSubscription, onOpenSettings }: CalendarViewProps) {
    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(() => startOfToday());
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

    // Calculate calendar grid for the current month
    const { calendarDays, startDate, endDate } = useMemo(() => {
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        // Start from Monday
        const start = new Date(monthStart);
        const dayOfWeek = start.getDay(); // 0 is Sunday, 1 is Monday...
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Calculate days to subtract to reach Monday
        start.setDate(start.getDate() - diff);

        // Calculate end date (completed weeks)
        const end = new Date(monthEnd);
        // Ensure we show at least 6 weeks or enough to complete the last week
        // 6 weeks * 7 days = 42 days
        const totalDays = 42;
        const currentDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (currentDays < totalDays) {
            end.setDate(end.getDate() + (totalDays - currentDays));
        }

        const days: Date[] = [];
        let d = new Date(start);
        while (d <= end) {
            days.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }

        return { calendarDays: days, startDate: start, endDate: end };
    }, [currentMonth]);

    // Generate events from subscriptions
    const allEvents = useMemo(() => {
        // Calculate total days between start and end
        if (!startDate || !endDate) return [];
        const daysCount = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return generateEventsForDateRange(subscriptions, startDate, daysCount);
    }, [subscriptions, startDate, endDate]);

    // Map days to DayData with filtered events
    const daysData = useMemo(() => {
        const today = startOfToday();
        return calendarDays.map((date) => {
            // Get events for this day
            let events = allEvents.filter((e) => isSameDay(e.date, date));

            // Apply category filter
            if (filters.categories.length > 0) {
                events = events.filter((e) => filters.categories.includes(e.category));
            }

            // Apply upcoming days filter (optional, arguably less useful in month view, but keeping logic)
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

            // Sort events by global sort order (if available on event's subscription, which we don't have direct access to here easily without lookup, 
            // but generateEventsForDateRange could be updated or we rely on repo sort)
            // Ideally events should carry sortOrder. For now, rely on default insertion order which comes from repo sorted query.

            return { date, events };
        });
    }, [calendarDays, allEvents, filters, searchQuery]);


    const handlePrevious = () => {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNext = () => {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleToday = () => {
        setCurrentMonth(startOfToday());
    };

    const selectedDayData = selectedDate
        ? daysData.find((d) => isSameDay(d.date, selectedDate))
        : null;

    const weekDays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

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
                            <h1 className="text-lg font-semibold text-foreground capitalize">
                                {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                            </h1>
                            {!isSameDay(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth(), 1)) && (
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
                <main className="flex-1 overflow-auto p-6 flex flex-col">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {weekDays.map((day) => (
                            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                                {day}
                            </div>
                        ))}
                    </div>

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
                        <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                            {daysData.map((day) => (
                                <DayCell
                                    key={day.date.toISOString()}
                                    data={day}
                                    isSelected={selectedDate ? isSameDay(day.date, selectedDate) : false}
                                    onClick={() => setSelectedDate(day.date)}
                                    isCurrentMonth={day.date.getMonth() === currentMonth.getMonth()}
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
