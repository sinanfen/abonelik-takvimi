import { useState } from 'react';
import {
    Search,
    Plus,
    Pencil,
    Copy,
    Trash2,
    Power,
    Filter,
    Loader2,
    Download,
    Upload,
    Settings,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { backupService } from '@/lib/backup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    useSubscriptions,
    useDeleteSubscription,
    useToggleSubscriptionActive,
    useCreateSubscription,
} from '@/features/subscriptions';
import type { Category, SubscriptionType, Subscription } from '@/types';

const TYPE_LABELS: Record<SubscriptionType, string> = {
    subscription: 'Abonelik',
    credit_card: 'Kredi Kartı',
    bill: 'Fatura',
    other: 'Diğer',
};

const CATEGORY_LABELS: Record<Category, string> = {
    Banking: 'Bankacılık',
    Entertainment: 'Eğlence',
    Bills: 'Faturalar',
    SaaS: 'SaaS',
    Insurance: 'Sigorta',
    Shopping: 'Alışveriş',
    Other: 'Diğer',
};

const CATEGORY_BADGE_VARIANTS: Record<
    Category,
    'banking' | 'entertainment' | 'bills' | 'saas' | 'insurance' | 'shopping' | 'other'
> = {
    Banking: 'banking',
    Entertainment: 'entertainment',
    Bills: 'bills',
    SaaS: 'saas',
    Insurance: 'insurance',
    Shopping: 'shopping',
    Other: 'other',
};

interface AdminPanelProps {
    onNewSubscription: () => void;
    onEditSubscription?: (subscription: Subscription) => void;
    onOpenSettings?: () => void;
}

export function AdminPanel({ onNewSubscription, onEditSubscription, onOpenSettings }: AdminPanelProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [showInactive, setShowInactive] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [subscriptionToDelete, setSubscriptionToDelete] = useState<Subscription | null>(null);

    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const queryClient = useQueryClient();

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await backupService.exportData();
        } catch (error) {
            console.error('Export failed:', error);
            alert(`Yedekleme hatası: ${JSON.stringify(error)}`);
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
            alert(`Geri yükleme hatası: ${JSON.stringify(error)}`);
        } finally {
            setIsImporting(false);
        }
    };

    // Queries and mutations
    const { data: subscriptions = [], isLoading, error } = useSubscriptions();
    const deleteMutation = useDeleteSubscription();
    const toggleActiveMutation = useToggleSubscriptionActive();
    const duplicateMutation = useCreateSubscription();

    // Filter subscriptions
    const filteredSubscriptions = subscriptions.filter((sub) => {
        // Search filter
        if (searchQuery && !sub.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        // Category filter
        if (categoryFilter !== 'all' && sub.category !== categoryFilter) {
            return false;
        }
        // Active filter
        if (!showInactive && !sub.isActive) {
            return false;
        }
        return true;
    });

    const formatDate = (date: Date | undefined) => {
        if (!date) return '-';
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatAmount = (amount: number | undefined, currency: string) => {
        if (amount === undefined) return '-';
        const symbols: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
        return `${symbols[currency] || currency} ${amount.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
        })}`;
    };

    const getNextPaymentDate = (sub: Subscription) => {
        // Simple calculation - in real app this would use the recurrence engine
        const today = new Date();
        const dayOfMonth = sub.recurrence.dayOfMonth || 1;
        const nextDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
        if (nextDate < today) {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }
        return nextDate;
    };

    const handleDelete = async () => {
        if (!subscriptionToDelete) return;
        try {
            await deleteMutation.mutateAsync(subscriptionToDelete.id);
            setDeleteDialogOpen(false);
            setSubscriptionToDelete(null);
        } catch (error) {
            console.error('Failed to delete subscription:', error);
        }
    };

    const handleToggleActive = async (id: string) => {
        try {
            await toggleActiveMutation.mutateAsync(id);
        } catch (error) {
            console.error('Failed to toggle subscription:', error);
        }
    };

    const handleDuplicate = async (sub: Subscription) => {
        try {
            await duplicateMutation.mutateAsync({
                name: `${sub.name} (Kopya)`,
                type: sub.type,
                category: sub.category,
                frequency: sub.recurrence.frequency,
                dayOfMonth: sub.recurrence.dayOfMonth,
                amount: sub.amount,
                currency: sub.currency,
                paymentMethod: sub.paymentMethod,
                notes: sub.notes,
                statementDay: sub.statementDay,
                dueDay: sub.dueDay,
                reminders: sub.reminders,
            });
        } catch (error) {
            console.error('Failed to duplicate subscription:', error);
        }
    };

    const openDeleteDialog = (sub: Subscription) => {
        setSubscriptionToDelete(sub);
        setDeleteDialogOpen(true);
    };

    if (error) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-destructive">Veriler yüklenemedi: {String(error)}</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h1 className="text-xl font-semibold text-foreground">Yönetim Paneli</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? 'Yedekleniyor...' : 'Yedekle'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleImport} disabled={isImporting}>
                        <Upload className="mr-2 h-4 w-4" />
                        {isImporting ? 'Yükleniyor...' : 'Geri Yükle'}
                    </Button>
                    <Button variant="outline" size="icon" onClick={onOpenSettings} title="Ayarlar">
                        <Settings className="h-4 w-4" />
                    </Button>
                    <Button onClick={onNewSubscription}>
                        <Plus className="h-4 w-4" />
                        Yeni Kayıt
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 border-b border-border px-6 py-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Abonelik ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tüm Kategoriler</SelectItem>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    variant={showInactive ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setShowInactive(!showInactive)}
                >
                    <Power className="mr-2 h-4 w-4" />
                    Pasifleri Göster
                </Button>

                <div className="ml-auto text-sm text-muted-foreground">
                    {filteredSubscriptions.length} abonelik
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 py-4">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ad</TableHead>
                                <TableHead>Tür</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead>Sonraki Tarih</TableHead>
                                <TableHead>Tutar</TableHead>
                                <TableHead>Durum</TableHead>
                                <TableHead className="text-right">İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSubscriptions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <p className="text-muted-foreground">
                                            {subscriptions.length === 0
                                                ? 'Henüz kayıt eklenmemiş. "Yeni Kayıt" butonuna tıklayarak başlayın.'
                                                : 'Filtrelere uygun abonelik bulunamadı'}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSubscriptions.map((sub) => (
                                    <TableRow key={sub.id} className={cn(!sub.isActive && 'opacity-50')}>
                                        <TableCell className="font-medium">{sub.name}</TableCell>
                                        <TableCell>{TYPE_LABELS[sub.type]}</TableCell>
                                        <TableCell>
                                            <Badge variant={CATEGORY_BADGE_VARIANTS[sub.category]}>
                                                {CATEGORY_LABELS[sub.category]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(getNextPaymentDate(sub))}</TableCell>
                                        <TableCell>{formatAmount(sub.amount, sub.currency)}</TableCell>
                                        <TableCell>
                                            <Badge variant={sub.isActive ? 'default' : 'secondary'}>
                                                {sub.isActive ? 'Aktif' : 'Pasif'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => onEditSubscription?.(sub)}
                                                    title="Düzenle"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleDuplicate(sub)}
                                                    disabled={duplicateMutation.isPending}
                                                    title="Kopyala"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleToggleActive(sub.id)}
                                                    disabled={toggleActiveMutation.isPending}
                                                    title={sub.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                                                >
                                                    <Power className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => openDeleteDialog(sub)}
                                                    title="Sil"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Aboneliği Sil</DialogTitle>
                        <DialogDescription>
                            "{subscriptionToDelete?.name}" aboneliğini silmek istediğinizden emin misiniz?
                            Bu işlem geri alınamaz.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            İptal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Siliniyor...
                                </>
                            ) : (
                                'Sil'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
