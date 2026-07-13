import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ThemeMode } from '@/theme';

export type AppLanguage = 'en' | 'si' | 'ta';

type SettingsState = {
  themeMode: ThemeMode;
  language: AppLanguage;
  currencyCode: string;
  activeVehicleId: string | null;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (language: AppLanguage) => void;
  setCurrencyCode: (code: string) => void;
  setActiveVehicleId: (id: string | null) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'dark',
      language: 'en',
      currencyCode: 'LKR',
      activeVehicleId: null,
      setThemeMode: (themeMode) => set({ themeMode }),
      setLanguage: (language) => set({ language }),
      setCurrencyCode: (currencyCode) => set({ currencyCode }),
      setActiveVehicleId: (activeVehicleId) => set({ activeVehicleId }),
    }),
    {
      name: 'drivemate-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
