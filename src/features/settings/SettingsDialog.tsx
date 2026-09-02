import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { KeyRound, Mail, Send, ShieldCheck, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore, type Theme } from "@/stores/useSettingsStore";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const {
    theme,
    setTheme,
    emailRemindersEnabled,
    emailProvider,
    emailAddress,
    emailRecipient,
    setEmailSettings,
  } = useSettingsStore();
  const [password, setPassword] = useState("");
  const [hasStoredPassword, setHasStoredPassword] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [isEmailBusy, setIsEmailBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPassword("");
    setEmailStatus(null);
    void invoke<boolean>("has_smtp_password")
      .then(setHasStoredPassword)
      .catch(() => setHasStoredPassword(false));
  }, [isOpen]);

  const emailConfig = {
    provider: emailProvider,
    username: emailAddress.trim(),
    recipient: emailRecipient.trim(),
  };

  const storePasswordIfEntered = async () => {
    if (!password) return hasStoredPassword;
    await invoke("store_smtp_password", { password });
    setPassword("");
    setHasStoredPassword(true);
    return true;
  };

  const handleSaveEmail = async () => {
    setIsEmailBusy(true);
    setEmailStatus(null);
    try {
      const passwordReady = await storePasswordIfEntered();
      if (
        emailRemindersEnabled &&
        (!emailAddress.trim() || !emailRecipient.trim() || !passwordReady)
      ) {
        throw new Error("E-posta adresleri ve uygulama şifresi zorunludur.");
      }
      setEmailStatus("E-posta ayarları bu cihazda kaydedildi.");
    } catch (error) {
      setEmailStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsEmailBusy(false);
    }
  };

  const handleTestEmail = async () => {
    setIsEmailBusy(true);
    setEmailStatus(null);
    try {
      const passwordReady = await storePasswordIfEntered();
      if (!emailAddress.trim() || !emailRecipient.trim() || !passwordReady) {
        throw new Error("E-posta adresleri ve uygulama şifresi zorunludur.");
      }
      await invoke("send_test_email", { config: emailConfig });
      setEmailStatus("Test e-postası gönderildi. Gelen kutunuzu kontrol edin.");
    } catch (error) {
      setEmailStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsEmailBusy(false);
    }
  };

  const handleDeletePassword = async () => {
    setIsEmailBusy(true);
    setEmailStatus(null);
    try {
      await invoke("delete_smtp_password");
      setPassword("");
      setHasStoredPassword(false);
      setEmailSettings({ emailRemindersEnabled: false });
      setEmailStatus(
        "Uygulama şifresi işletim sistemi kimlik kasasından silindi.",
      );
    } catch (error) {
      setEmailStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsEmailBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
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

          <div className="space-y-4 border-t border-border pt-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> E-posta bildirimleri
                </Label>
                <p className="text-sm text-muted-foreground">
                  Uygulama açıkken yaklaşan ödemeleri e-posta ile bildirir.
                </p>
              </div>
              <Switch
                checked={emailRemindersEnabled}
                onCheckedChange={(checked) =>
                  setEmailSettings({ emailRemindersEnabled: checked })
                }
              />
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Yerel ve
                dışa kapalı
              </div>
              Aracı sunucu kullanılmaz. E-posta doğrudan seçilen sağlayıcının
              sabit SMTP adresine gider; uygulama şifresi yalnızca işletim
              sisteminin kimlik kasasında tutulur.
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex h-5 items-center">
                  E-posta sağlayıcısı
                </Label>
                <div className="flex h-10 items-center rounded-[10px] border border-input bg-secondary/40 px-3 text-sm">
                  Gmail · güvenli STARTTLS
                </div>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="email-address"
                  className="flex h-5 items-center"
                >
                  Gönderen hesap
                </Label>
                <Input
                  id="email-address"
                  type="email"
                  className="h-10"
                  value={emailAddress}
                  maxLength={254}
                  placeholder="ornek@gmail.com"
                  onChange={(event) =>
                    setEmailSettings({ emailAddress: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="email-recipient"
                  className="flex h-5 items-center"
                >
                  Hatırlatma alıcısı
                </Label>
                <Input
                  id="email-recipient"
                  type="email"
                  className="h-10"
                  value={emailRecipient}
                  maxLength={254}
                  placeholder="bana@example.com"
                  onChange={(event) =>
                    setEmailSettings({ emailRecipient: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="smtp-password"
                  className="flex h-5 items-center gap-2"
                >
                  <KeyRound className="h-3.5 w-3.5" /> Uygulama şifresi
                </Label>
                <Input
                  id="smtp-password"
                  type="password"
                  className="h-10"
                  value={password}
                  maxLength={512}
                  autoComplete="new-password"
                  placeholder={
                    hasStoredPassword
                      ? "Kimlik kasasında kayıtlı"
                      : "Normal hesap şifresi değil"
                  }
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Normal hesap şifrenizi kullanmayın. Sağlayıcınızın iki adımlı
              doğrulama sonrasında ürettiği uygulama şifresini girin. Hatırlatma
              gönderimi için internet gerekir.
            </p>

            {emailStatus && (
              <div className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">
                {emailStatus}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {hasStoredPassword && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeletePassword}
                  disabled={isEmailBusy}
                >
                  <Trash2 className="h-4 w-4" /> Şifreyi sil
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestEmail}
                disabled={isEmailBusy}
              >
                <Send className="h-4 w-4" /> Test gönder
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEmail}
                disabled={isEmailBusy}
              >
                Ayarları kaydet
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
