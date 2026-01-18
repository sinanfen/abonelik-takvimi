import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSettingsStore, type Theme } from '@/stores/useSettingsStore';

interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
    const { theme, setTheme, notificationsEnabled, toggleNotifications } = useSettingsStore();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ayarlar</DialogTitle>
                    <DialogDescription>
                        Uygulama tercihlerinizi buradan yönetebilirsiniz.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Theme Settings */}
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-1">
                            <Label>Tema</Label>
                            <p className="text-sm text-muted-foreground">
                                Görünüm modunu seçin.
                            </p>
                        </div>
                        <Select
                            value={theme}
                            onValueChange={(val) => setTheme(val as Theme)}
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="dark">Koyu</SelectItem>
                                <SelectItem value="light">Açık</SelectItem>
                                <SelectItem value="system">Sistem</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notification Settings */}
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-1">
                            <Label>Bildirimler</Label>
                            <p className="text-sm text-muted-foreground">
                                Masaüstü bildirimlerini etkinleştir.
                            </p>
                        </div>
                        <Switch
                            checked={notificationsEnabled}
                            onCheckedChange={toggleNotifications}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
