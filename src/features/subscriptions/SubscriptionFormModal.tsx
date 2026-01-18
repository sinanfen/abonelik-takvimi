import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    subscriptionFormSchema,
    subscriptionTypes,
    categories,
    frequencies,
    reminderOptions,
    defaultFormValues,
    type SubscriptionFormData,
} from './schema';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface SubscriptionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: SubscriptionFormData) => Promise<void> | void;
    initialData?: Partial<SubscriptionFormData>;
}

export function SubscriptionFormModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
}: SubscriptionFormModalProps) {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<SubscriptionFormData>({
        resolver: zodResolver(subscriptionFormSchema),
        defaultValues: { ...defaultFormValues, ...initialData },
    });

    useEffect(() => {
        if (isOpen) {
            reset({ ...defaultFormValues, ...initialData });
            setSubmitError(null);
        }
    }, [isOpen, initialData, reset]);

    const selectedType = watch('type');
    const isCreditCard = selectedType === 'credit_card';
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleFormSubmit = async (data: SubscriptionFormData) => {
        setSubmitError(null);
        try {
            await onSubmit(data); // onSubmit promise dönmeli
            reset();
            // onClose parent tarafından çağrılmalı veya burada submit başarılıysa?
            // App.tsx handleSaveSubscription başarılı olursa onClose çağırıyor ancak burada hata alırsa resetlenmemeli.
            // Reset'i başarıdan sonraya almak daha doğru ama App.tsx modalı kapatıyor.
            // Eğer reset yapmazsak bir sonraki açılışta eski veriler kalabilir (initialData değişmezse).
            // Ancak modal her açıldığında unmount/mount olmuyor.

            // Eğer başarıyla tamamlanırsa:
            reset();
        } catch (error: any) {
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
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Yeni Kayıt</DialogTitle>
                    <DialogDescription>
                        Yeni bir abonelik veya ödeme ekleyin.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Abonelik Adı</Label>
                        <Input
                            id="name"
                            placeholder="Netflix, Spotify..."
                            {...register('name')}
                            className={cn(errors.name && 'border-destructive')}
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                        <Label>Tür</Label>
                        <Select
                            value={watch('type')}
                            onValueChange={(value) =>
                                setValue('type', value as SubscriptionFormData['type'])
                            }
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
                            value={watch('category')}
                            onValueChange={(value) =>
                                setValue('category', value as SubscriptionFormData['category'])
                            }
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
                        <Label>Tekrar Sıklığı</Label>
                        <Select
                            value={watch('frequency')}
                            onValueChange={(value) =>
                                setValue('frequency', value as SubscriptionFormData['frequency'])
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sıklık seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                {frequencies.map((freq) => (
                                    <SelectItem key={freq.value} value={freq.value}>
                                        {freq.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Day of Month (for monthly) */}
                    {!isCreditCard && (
                        <div className="space-y-2">
                            <Label htmlFor="dayOfMonth">Ayın Günü</Label>
                            <Input
                                id="dayOfMonth"
                                type="number"
                                min={1}
                                max={31}
                                placeholder="1-31"
                                {...register('dayOfMonth')}
                            />
                        </div>
                    )}

                    {/* Credit Card Fields */}
                    {isCreditCard && (
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

                    {/* Amount */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="amount">Tutar (Opsiyonel)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min={0}
                                placeholder="99.99"
                                {...register('amount')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency">Para Birimi</Label>
                            <Select
                                value={watch('currency')}
                                onValueChange={(value) => setValue('currency', value)}
                            >
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
                                        checked={watch('reminders')?.includes(option.value)}
                                        onCheckedChange={(checked) => {
                                            const current = watch('reminders') || [];
                                            if (checked) {
                                                setValue('reminders', [...current, option.value]);
                                            } else {
                                                setValue(
                                                    'reminders',
                                                    current.filter((v) => v !== option.value)
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
                        <Input
                            id="notes"
                            placeholder="Ek bilgi..."
                            {...register('notes')}
                        />
                    </div>

                    {submitError && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                            {submitError}
                        </div>
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
