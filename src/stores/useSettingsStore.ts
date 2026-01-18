import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';

interface SettingsState {
    theme: Theme;
    notificationsEnabled: boolean;
    setTheme: (theme: Theme) => void;
    toggleNotifications: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            theme: 'dark', // Default dark
            notificationsEnabled: true,
            setTheme: (theme) => set({ theme }),
            toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
        }),
        {
            name: 'settings-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
