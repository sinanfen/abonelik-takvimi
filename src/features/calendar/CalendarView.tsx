import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backupService } from '@/lib/backup';
import { addDays, startOfToday, format, isSameDay, isBefore } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Plus, Settings, Download, Upload, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DayCell } from './DayCell';
import { DayDrawer } from './DayDrawer';
import { FilterSidebar, defaultFilters, type FilterState } from './FilterSidebar';
import { toMonthKey, useMonthlySnapshot } from '@/features/snapshots';

interface CalendarViewProps {
    onNewSubscription?: (date?: Date) => void;
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
                queryClient.invalidateQueries({ queryKey: ['snapshots'] });
            }
        } catch (error) {
            console.error('Import failed:', error);
            alert(`Geri yükleme hatası: ${error}`);
        } finally {
            setIsImporting(false);
        }
    };

    const monthKey = toMonthKey(currentMonth);
    const currentMonthKey = toMonthKey(new Date());
    const { data: snapshot, isLoading, error } = useMonthlySnapshot(monthKey);

    // Calculate calendar grid for the current month
    const calendarDays = useMemo(() => {
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
        const d = new Date(start);
        while (d <= end) {
            days.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }

        return days;
    }, [currentMonth]);

    const allEvents = useMemo(() => snapshot?.items ?? [], [snapshot?.items]);

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
                events = events.filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()));
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

    const handleSelectDate = (date: Date) => {
        if (toMonthKey(date) !== monthKey) {
            setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
        }
        setSelectedDate(date);
    };

    const selectedDayData = selectedDate ? daysData.find((d) => isSameDay(d.date, selectedDate)) : null;

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
                            {!isSameDay(
                                new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
                                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                            ) && (
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
                        <Button
                            onClick={() =>
                                onNewSubscription?.(
                                    new Date(
                                        currentMonth.getFullYear(),
                                        currentMonth.getMonth(),
                                        toMonthKey(new Date()) === toMonthKey(currentMonth) ? new Date().getDate() : 1,
                                    ),
                                )
                            }
                        >
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
                    ) : error ? (
                        <div className="flex h-full items-center justify-center text-destructive">
                            Snapshot yüklenemedi: {String(error)}
                        </div>
                    ) : (
                        <>
                            {allEvents.length === 0 && (
                                <p className="mb-3 text-sm text-muted-foreground">
                                    {snapshot === null
                                        ? 'Bu ay için kayıtlı snapshot yok; geçmiş ödemeler tahmin edilmez. Bir güne tıklayarak tek seferlik harcama ekleyebilirsiniz.'
                                        : 'Bu ay için kayıt yok. Bir güne tıklayarak harcama ekleyebilirsiniz.'}
                                </p>
                            )}
                            <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                                {daysData.map((day) => (
                                    <DayCell
                                        key={day.date.toISOString()}
                                        data={day}
                                        isSelected={selectedDate ? isSameDay(day.date, selectedDate) : false}
                                        onClick={() => handleSelectDate(day.date)}
                                        isCurrentMonth={day.date.getMonth() === currentMonth.getMonth()}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* Day Drawer */}
            <DayDrawer
                isOpen={selectedDate !== null}
                onClose={() => setSelectedDate(null)}
                dayData={selectedDayData ?? null}
                onNewSubscription={() => onNewSubscription?.(selectedDate ?? currentMonth)}
                onEventDateChange={setSelectedDate}
                isReadOnly={monthKey < currentMonthKey}
                canUpdateStatus={monthKey <= currentMonthKey}
                canEditDetails
                detailEvents={allEvents}
            />
        </div>
    );
}
