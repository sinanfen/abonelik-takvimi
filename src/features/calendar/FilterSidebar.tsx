import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

const CATEGORIES: { value: Category; label: string; color: string }[] = [
    { value: 'Banking', label: 'Bankacılık', color: '#60A5FA' },
    { value: 'Entertainment', label: 'Eğlence', color: '#A78BFA' },
    { value: 'Bills', label: 'Faturalar', color: '#FBBF24' },
    { value: 'SaaS', label: 'SaaS', color: '#34D399' },
    { value: 'Insurance', label: 'Sigorta', color: '#FB7185' },
    { value: 'Shopping', label: 'Alışveriş', color: '#F97316' },
    { value: 'Other', label: 'Diğer', color: '#94A3B8' },
];

export interface FilterState {
    categories: Category[];
    upcomingDays: number | null; // null = all, 7 = next 7 days
    showPaymentsOnly: boolean;
}

interface FilterSidebarProps {
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export function FilterSidebar({
    filters,
    onFiltersChange,
    isCollapsed,
    onToggleCollapse,
}: FilterSidebarProps) {
    const [expandedSections, setExpandedSections] = useState({
        categories: true,
        time: true,
        type: true,
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const toggleCategory = (category: Category) => {
        const newCategories = filters.categories.includes(category)
            ? filters.categories.filter((c) => c !== category)
            : [...filters.categories, category];
        onFiltersChange({ ...filters, categories: newCategories });
    };

    const clearFilters = () => {
        onFiltersChange({
            categories: [],
            upcomingDays: null,
            showPaymentsOnly: false,
        });
    };

    const hasActiveFilters =
        filters.categories.length > 0 ||
        filters.upcomingDays !== null ||
        filters.showPaymentsOnly;

    if (isCollapsed) {
        return (
            <div className="flex w-12 flex-col items-center border-r border-border bg-card py-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleCollapse}
                    className="relative"
                >
                    <Filter className="h-5 w-5" />
                    {hasActiveFilters && (
                        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />
                    )}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex w-64 flex-col border-r border-border bg-card">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Filtreler</span>
                </div>
                <div className="flex items-center gap-1">
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                            <X className="mr-1 h-3 w-3" />
                            Temizle
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
                        <ChevronDown className="h-4 w-4 rotate-90" />
                    </Button>
                </div>
            </div>

            {/* Filter Sections */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Categories */}
                <div className="space-y-2">
                    <button
                        onClick={() => toggleSection('categories')}
                        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
                    >
                        Kategoriler
                        {expandedSections.categories ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </button>
                    {expandedSections.categories && (
                        <div className="space-y-1">
                            {CATEGORIES.map((cat) => {
                                const isActive = filters.categories.includes(cat.value);
                                return (
                                    <button
                                        key={cat.value}
                                        onClick={() => toggleCategory(cat.value)}
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                                            isActive
                                                ? 'bg-primary/10 text-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'h-3 w-3 rounded-full border-2',
                                                isActive ? 'border-primary bg-primary' : 'border-muted-foreground'
                                            )}
                                            style={
                                                isActive
                                                    ? { backgroundColor: cat.color, borderColor: cat.color }
                                                    : undefined
                                            }
                                        />
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Time Filter */}
                <div className="space-y-2">
                    <button
                        onClick={() => toggleSection('time')}
                        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
                    >
                        Zaman Aralığı
                        {expandedSections.time ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </button>
                    {expandedSections.time && (
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: null, label: 'Tümü' },
                                { value: 7, label: '7 Gün' },
                                { value: 14, label: '14 Gün' },
                            ].map((option) => (
                                <Badge
                                    key={option.label}
                                    variant={filters.upcomingDays === option.value ? 'default' : 'outline'}
                                    className="cursor-pointer"
                                    onClick={() =>
                                        onFiltersChange({ ...filters, upcomingDays: option.value })
                                    }
                                >
                                    {option.label}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Type Filter */}
                <div className="space-y-2">
                    <button
                        onClick={() => toggleSection('type')}
                        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
                    >
                        Görünüm
                        {expandedSections.type ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </button>
                    {expandedSections.type && (
                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant={!filters.showPaymentsOnly ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() =>
                                    onFiltersChange({ ...filters, showPaymentsOnly: false })
                                }
                            >
                                Hepsi
                            </Badge>
                            <Badge
                                variant={filters.showPaymentsOnly ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() =>
                                    onFiltersChange({ ...filters, showPaymentsOnly: true })
                                }
                            >
                                Sadece Ödemeler
                            </Badge>
                        </div>
                    )}
                </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
                <div className="border-t border-border p-4">
                    <div className="flex flex-wrap gap-1">
                        {filters.categories.map((cat) => (
                            <Badge
                                key={cat}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => toggleCategory(cat)}
                            >
                                {cat}
                                <X className="ml-1 h-3 w-3" />
                            </Badge>
                        ))}
                        {filters.upcomingDays && (
                            <Badge
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => onFiltersChange({ ...filters, upcomingDays: null })}
                            >
                                {filters.upcomingDays} gün
                                <X className="ml-1 h-3 w-3" />
                            </Badge>
                        )}
                        {filters.showPaymentsOnly && (
                            <Badge
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => onFiltersChange({ ...filters, showPaymentsOnly: false })}
                            >
                                Ödemeler
                                <X className="ml-1 h-3 w-3" />
                            </Badge>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export const defaultFilters: FilterState = {
    categories: [],
    upcomingDays: null,
    showPaymentsOnly: false,
};
