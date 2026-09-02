import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "dark" | "light" | "system";
export type EmailProvider = "gmail";

interface SettingsState {
  theme: Theme;
  emailRemindersEnabled: boolean;
  emailProvider: EmailProvider;
  emailAddress: string;
  emailRecipient: string;
  setTheme: (theme: Theme) => void;
  setEmailSettings: (
    settings: Partial<
      Pick<
        SettingsState,
        | "emailRemindersEnabled"
        | "emailProvider"
        | "emailAddress"
        | "emailRecipient"
      >
    >,
  ) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark", // Default dark
      emailRemindersEnabled: false,
      emailProvider: "gmail",
      emailAddress: "",
      emailRecipient: "",
      setTheme: (theme) => set({ theme }),
      setEmailSettings: (settings) => set(settings),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
