import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    subscriptionFormSchema,
    subscriptionTypes,
    categories,
    frequencies,
    recurrenceTypes,
    paymentModes,
    amountModes,
    reminderOptions,
    getDefaultFormValues,
    type SubscriptionFormData,
} from './schema';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface SubscriptionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: SubscriptionFormData) => Promise<void> | void;
    initialData?: Partial<SubscriptionFormData>;
    initialDate?: Date;
}

export function SubscriptionFormModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    initialDate,
}: SubscriptionFormModalProps) {
    const {
        register,
        handleSubmit,
        control,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<SubscriptionFormData>({
        resolver: zodResolver(subscriptionFormSchema),
        defaultValues: { ...getDefaultFormValues(initialDate), ...initialData },
    });
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            reset({
                ...getDefaultFormValues(initialDate),
                ...initialData,
            });
        }
    }, [isOpen, initialData, initialDate, reset]);

    const selectedType = useWatch({ control, name: 'type' });
    const isCreditCard = selectedType === 'credit_card';
    const recurrenceType = useWatch({ control, name: 'recurrenceType' });
    const paymentMode = useWatch({ control, name: 'paymentMode' });
    const amountMode = useWatch({ control, name: 'amountMode' });
    const isVariable = recurrenceType === 'recurring' && amountMode === 'variable';
    const frequency = useWatch({ control, name: 'frequency' });
    const selectedCategory = useWatch({ control, name: 'category' });
    const selectedCurrency = useWatch({ control, name: 'currency' });
    const selectedReminders = useWatch({ control, name: 'reminders' }) ?? [];
    useEffect(() => {
        if (isCreditCard && recurrenceType === 'recurring') {
            setValue('frequency', 'monthly');
        }
    }, [isCreditCard, recurrenceType, setValue]);

    const handleFormSubmit = async (data: SubscriptionFormData) => {
        setSubmitError(null);
        try {
            await onSubmit(data);
            reset();
        } catch (error: unknown) {
            console.error('Form submission error:', error);
            // Hata detayını göster
            let errorMessage = 'Beklenmeyen bir hata oluştu';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else {
                try {
                    errorMessage = JSON.stringify(error);
                } catch {
                    errorMessage = String(error);
                }
            }
            setSubmitError(errorMessage);
        }
    };

    const handleClose = () => {
        reset();
        setSubmitError(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Kaydı Düzenle' : 'Yeni Kayıt'}</DialogTitle>
                    <DialogDescription>Tek seferlik bir harcama veya tekrar eden bir ödeme ekleyin.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Kayıt Adı</Label>
                        <Input
                            id="name"
                            placeholder="Kira, Spotify, market alışverişi..."
                            {...register('name')}
                            className={cn(errors.name && 'border-destructive')}
                        />
                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                        <Label>Tür</Label>
                        <Select
                            value={selectedType}
                            onValueChange={(value) => {
                                setValue('type', value as SubscriptionFormData['type']);
                                if (!initialData) {
                                    if (value !== 'other') setValue('recurrenceType', 'recurring');
                                    setValue(
                                        'amountMode',
                                        value === 'bill' || value === 'credit_card' ? 'variable' : 'fixed',
                                    );
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Tür seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                {subscriptionTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label>Kategori</Label>
                        <Select
                            value={selectedCategory}
                            onValueChange={(value) => {
                                setValue('category', value as SubscriptionFormData['category']);
                                if (!initialData) {
                                    if (value === 'Utilities') {
                                        setValue('recurrenceType', 'recurring');
                                        setValue('amountMode', 'variable');
                                    } else if (value === 'Food' || value === 'Shopping') {
                                        setValue('recurrenceType', 'one_time');
                                    } else if (value === 'Housing') {
                                        setValue('recurrenceType', 'recurring');
                                        setValue('amountMode', 'fixed');
                                    }
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Kategori seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-3 w-3 rounded-full"
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            {cat.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Frequency */}
                    <div className="space-y-2">
                        <Label>Ödeme Düzeni</Label>
                        <Select
                            value={recurrenceType}
                            onValueChange={(value) =>
                                setValue('recurrenceType', value as SubscriptionFormData['recurrenceType'])
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Ödeme düzeni seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                {recurrenceTypes.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {recurrenceType === 'one_time'
                                ? 'Market ve alışveriş gibi harcamalar yalnızca seçilen tarihte yer alır. Her alışveriş için ayrı kayıt ekleyebilirsiniz.'
                                : 'Kira, abonelik ve faturalar seçtiğiniz sıklıkta devam eder.'}
                        </p>
                    </div>

                    {recurrenceType === 'recurring' && (
                        <div className="space-y-2">
                            <Label>Tutar düzeni</Label>
                            <Select
                                value={amountMode}
                                onValueChange={(value) =>
                                    setValue('amountMode', value as SubscriptionFormData['amountMode'])
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {amountModes.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {isVariable
                                    ? 'Su, elektrik, doğalgaz: her dönemin tutarı boş başlar. Takvimde Detay üzerinden o dönemin tutarını ve ödeme tarihini girin.'
                                    : 'Kira, aidat, Netflix: girdiğiniz tutar sonraki dönemlerde de kullanılır. Fiyat değiştiğinde bu kaydı düzenleyin.'}
                            </p>
                        </div>
                    )}

                    {recurrenceType === 'recurring' && !isCreditCard && (
                        <div className="space-y-2">
                            <Label>Tekrar Sıklığı</Label>
                            <Select
                                value={frequency}
                                onValueChange={(value) =>
                                    setValue('frequency', value as SubscriptionFormData['frequency'])
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sıklık seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {frequencies.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {recurrenceType === 'recurring' && frequency === 'monthly' && !isCreditCard && (
                        <div className="space-y-2">
                            <Label htmlFor="dayOfMonth">
                                {isVariable ? 'Beklenen ödeme günü' : 'Her ayın kaçıncı günü?'}
                            </Label>
                            <Input
                                id="dayOfMonth"
                                type="number"
                                min={1}
                                max={31}
                                placeholder="1-31"
                                {...register('dayOfMonth')}
                            />
                            {errors.dayOfMonth && (
                                <p className="text-sm text-destructive">{errors.dayOfMonth.message}</p>
                            )}
                            {isVariable && (
                                <p className="text-xs text-muted-foreground">
                                    Fatura geldiğinde o ayın gerçek son ödeme tarihini Detay üzerinden
                                    değiştirebilirsiniz.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Ödeme yöntemi</Label>
                        <Select
                            value={paymentMode}
                            onValueChange={(value) =>
                                setValue('paymentMode', value as SubscriptionFormData['paymentMode'])
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Ödeme yöntemi seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentModes.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {paymentMode === 'automatic' && (
                            <p className="text-xs text-muted-foreground">
                                Hatırlatma, tahsilat ve hesap bakiyesi kontrolü olarak gönderilir.
                            </p>
                        )}
                    </div>

                    {/* Credit Card Fields */}
                    {isCreditCard && recurrenceType === 'recurring' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="statementDay">Hesap Kesim Günü</Label>
                                <Input
                                    id="statementDay"
                                    type="number"
                                    min={1}
                                    max={31}
                                    placeholder="15"
                                    {...register('statementDay')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dueDay">Son Ödeme Günü</Label>
                                <Input
                                    id="dueDay"
                                    type="number"
                                    min={1}
                                    max={31}
                                    placeholder="25"
                                    {...register('dueDay')}
                                />
                            </div>
                        </div>
                    )}

                    <div className={cn('grid gap-4', recurrenceType === 'recurring' && 'grid-cols-2')}>
                        <div className="space-y-2">
                            <Label htmlFor="startDate">
                                {recurrenceType === 'one_time' ? 'Harcama / ödeme tarihi' : 'Başlangıç tarihi'}
                            </Label>
                            <Input
                                id="startDate"
                                type="date"
                                {...register('startDate')}
                                className={cn(errors.startDate && 'border-destructive')}
                            />
                            {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
                        </div>
                        {recurrenceType === 'recurring' && (
                            <div className="space-y-2">
                                <Label htmlFor="endDate">Bitiş tarihi (Opsiyonel)</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    {...register('endDate')}
                                    className={cn(errors.endDate && 'border-destructive')}
                                />
                                {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
                            </div>
                        )}
                    </div>

                    {/* Amount */}
                    <div className={cn('grid gap-4', !isVariable && 'grid-cols-3')}>
                        {!isVariable && (
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="amount">
                                    {recurrenceType === 'one_time' ? 'Harcama tutarı' : 'Sabit tutar'} (Opsiyonel)
                                </Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    placeholder="99.99"
                                    {...register('amount')}
                                />
                                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="currency">Para Birimi</Label>
                            <Select value={selectedCurrency} onValueChange={(value) => setValue('currency', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TRY">₺ TRY</SelectItem>
                                    <SelectItem value="USD">$ USD</SelectItem>
                                    <SelectItem value="EUR">€ EUR</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Reminders */}
                    <div className="space-y-3">
                        <Label>Hatırlatmalar</Label>
                        <div className="flex flex-wrap gap-4">
                            {reminderOptions.map((option) => (
                                <div key={option.value} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`reminder-${option.value}`}
                                        checked={selectedReminders.includes(option.value)}
                                        onCheckedChange={(checked) => {
                                            const current = selectedReminders;
                                            if (checked) {
                                                setValue('reminders', [...current, option.value]);
                                            } else {
                                                setValue(
                                                    'reminders',
                                                    current.filter((v) => v !== option.value),
                                                );
                                            }
                                        }}
                                    />
                                    <Label
                                        htmlFor={`reminder-${option.value}`}
                                        className="text-sm font-normal cursor-pointer"
                                    >
                                        {option.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
                        <Input id="notes" placeholder="Ek bilgi..." {...register('notes')} />
                    </div>

                    {submitError && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{submitError}</div>
                    )}

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={handleClose}>
                            İptal
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
